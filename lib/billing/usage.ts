import { createInsforgeServer, createInsforgeAdmin } from "@/lib/insforge-server";
import { BILLING_PLANS, BillingEventType, getPeriodBoundaries } from "./plans";
import { getUserEntitlement, UserEntitlement } from "./entitlements";

export class QuotaExceededError extends Error {
  eventType: BillingEventType;
  limit: number;
  current: number;
  planKey: string;

  constructor(eventType: BillingEventType, current: number, limit: number, planKey: string) {
    super(`Quota exceeded for ${eventType}. Current usage: ${current}, Limit: ${limit} on plan ${planKey}.`);
    this.name = "QuotaExceededError";
    this.eventType = eventType;
    this.limit = limit;
    this.current = current;
    this.planKey = planKey;
  }
}

/**
 * Checks if the database error is a unique constraint violation on the usage ledger
 * idempotency key (PostgreSQL error code 23505).
 * 
 * @param error - An object representing the database error.
 * @returns True if it is a unique constraint violation, otherwise false.
 */
export function isUniqueConstraintViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || !!error.message?.includes("uq_usage_ledger_user_event_idempotency");
}

/**
 * Computes the total usage quantity recorded for each billing event type
 * within the user's current billing period.
 * 
 * @param userId - The unique identifier of the user.
 * @param entitlement - The user's active billing entitlement.
 * @returns A record mapping event types to their accumulated usage counts.
 * @throws Error if the database query fails.
 */
export async function getCurrentPeriodUsage(userId: string, entitlement: UserEntitlement): Promise<Record<BillingEventType, number>> {
  const usage: Record<BillingEventType, number> = {
    job_search_run: 0,
    job_match_score: 0,
    company_research_run: 0,
    tailored_resume_generate: 0,
    base_resume_generate: 0,
    resume_extract: 0,
  };

  try {
    const { periodStart, periodEnd } = getPeriodBoundaries(entitlement);
    const insforge = await createInsforgeServer();

    const { data, error } = await insforge.database
      .from("usage_ledger")
      .select("event_type, quantity")
      .eq("user_id", userId)
      .gte("created_at", periodStart.toISOString())
      .lt("created_at", periodEnd.toISOString());

    if (error) {
      console.error("[billing/usage] Error loading current period usage:", error);
      throw new Error(`Database error loading current period usage: ${error.message}`);
    }

    if (data) {
      for (const row of data) {
        const type = row.event_type as BillingEventType;
        if (type in usage) {
          usage[type] += row.quantity || 0;
        }
      }
    }
  } catch (error) {
    console.error("[billing/usage] Error in getCurrentPeriodUsage:", error);
    throw error;
  }

  return usage;
}

/**
 * Checks whether the user has sufficient remaining quota for a given event type and quantity.
 * 
 * @param userId - The unique identifier of the user.
 * @param eventType - The type of billing event being evaluated.
 * @param quantity - The amount of quota requested (defaults to 1).
 * @returns An object containing the evaluation result (allowed), current usage, limit, and active plan key.
 */
export async function checkQuotaAvailable(
  userId: string,
  eventType: BillingEventType,
  quantity: number = 1
): Promise<{ allowed: boolean; limit: number; current: number; planKey: "free" | "pro" }> {
  try {
    const entitlement = await getUserEntitlement(userId);
    const plan = BILLING_PLANS[entitlement.planKey];
    const limit = plan.quotas[eventType].limit;

    const usage = await getCurrentPeriodUsage(userId, entitlement);
    const current = usage[eventType];

    return {
      allowed: current + quantity <= limit,
      limit,
      current,
      planKey: entitlement.planKey,
    };
  } catch (error) {
    console.error("[billing/usage] checkQuotaAvailable failed closed due to error:", error);
    return {
      allowed: false,
      limit: 0,
      current: 0,
      planKey: "free",
    };
  }
}

/**
 * Asserts that the user has enough quota available for a given billing event type.
 * Throws a QuotaExceededError if the quota check fails.
 * 
 * @param userId - The unique identifier of the user.
 * @param eventType - The type of billing event being evaluated.
 * @param quantity - The quantity requested (defaults to 1).
 * @throws QuotaExceededError if the quota is exceeded.
 */
export async function assertQuotaAvailable(userId: string, eventType: BillingEventType, quantity: number = 1): Promise<void> {
  const check = await checkQuotaAvailable(userId, eventType, quantity);
  if (!check.allowed) {
    throw new QuotaExceededError(eventType, check.current, check.limit, check.planKey);
  }
}

/**
 * Records a usage event in the ledger. Calls a database RPC function to perform
 * the check-and-insert atomically to prevent concurrent race conditions.
 * 
 * @param userId - The unique identifier of the user.
 * @param eventType - The type of billing event being recorded.
 * @param quantity - The quantity of the usage (defaults to 1).
 * @param idempotencyKey - A unique key to prevent duplicate recordings of the same event.
 * @param metadata - Arbitrary metadata associated with the event.
 * @param sourceRoute - The route from which the event originated.
 * @param referenceId - A reference ID (e.g. job ID or resume ID).
 * @returns An object indicating the success status, and optional error code or message.
 */
export async function recordUsage(
  userId: string,
  eventType: BillingEventType,
  quantity: number = 1,
  idempotencyKey: string,
  metadata: Record<string, unknown> = {},
  sourceRoute?: string,
  referenceId?: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    const entitlement = await getUserEntitlement(userId);
    const { periodStart, periodEnd } = getPeriodBoundaries(entitlement);
    const plan = BILLING_PLANS[entitlement.planKey];
    const limit = plan.quotas[eventType].limit;

    // RLS: Only SELECT is permitted on usage_ledger for authenticated users.
    // Inserts must bypass RLS via the admin client using the RPC function record_usage_with_quota_check.
    const insforgeAdmin = createInsforgeAdmin();

    const { data, error } = await insforgeAdmin.database.rpc("record_usage_with_quota_check", {
      p_user_id: userId,
      p_event_type: eventType,
      p_quantity: quantity,
      p_idempotency_key: idempotencyKey,
      p_limit: limit,
      p_period_start: periodStart.toISOString(),
      p_period_end: periodEnd.toISOString(),
      p_source_route: sourceRoute || null,
      p_reference_id: referenceId || null,
      p_metadata: metadata,
    });

    if (error) {
      if (isUniqueConstraintViolation(error)) {
        return { success: true }; // Idempotent success
      }
      console.error("[billing/usage] RPC Error in recordUsage:", error);
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; status: string; current?: number; limit?: number } | null;
    if (!result) {
      return { success: false, error: "No response from database RPC." };
    }

    if (!result.success) {
      if (result.status === "quota_exceeded") {
        return {
          success: false,
          code: "QUOTA_EXCEEDED",
          error: `Quota exceeded for ${eventType}. Current usage: ${result.current}, Limit: ${result.limit}.`,
        };
      }
      return { success: false, error: `Failed to record usage: ${result.status}` };
    }

    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error("[billing/usage] Error in recordUsage:", err);
    return { success: false, error: err.message || String(error) };
  }
}
