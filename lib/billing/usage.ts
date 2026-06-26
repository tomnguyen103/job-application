import { createInsforgeServer } from "@/lib/insforge-server";
import { BILLING_PLANS, BillingEventType } from "./plans";
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

export function getPeriodBoundaries(entitlement: UserEntitlement): { periodStart: Date; periodEnd: Date } {
  if (entitlement.planKey === "pro" && entitlement.currentPeriodStart && entitlement.currentPeriodEnd) {
    return {
      periodStart: new Date(entitlement.currentPeriodStart),
      periodEnd: new Date(entitlement.currentPeriodEnd),
    };
  }

  // Free/default calendar month boundary
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { periodStart, periodEnd };
}

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
      return usage;
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
  }

  return usage;
}

export async function checkQuotaAvailable(
  userId: string,
  eventType: BillingEventType,
  quantity: number = 1
): Promise<{ allowed: boolean; limit: number; current: number; planKey: "free" | "pro" }> {
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
}

export async function assertQuotaAvailable(userId: string, eventType: BillingEventType, quantity: number = 1): Promise<void> {
  const check = await checkQuotaAvailable(userId, eventType, quantity);
  if (!check.allowed) {
    throw new QuotaExceededError(eventType, check.current, check.limit, check.planKey);
  }
}

export async function recordUsage(
  userId: string,
  eventType: BillingEventType,
  quantity: number = 1,
  idempotencyKey: string,
  metadata: Record<string, unknown> = {},
  sourceRoute?: string,
  referenceId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const entitlement = await getUserEntitlement(userId);
    const { periodStart, periodEnd } = getPeriodBoundaries(entitlement);
    const insforge = await createInsforgeServer();

    const { error } = await insforge.database
      .from("usage_ledger")
      .insert([
        {
          user_id: userId,
          event_type: eventType,
          quantity,
          idempotency_key: idempotencyKey,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          source_route: sourceRoute || null,
          reference_id: referenceId || null,
          metadata,
        },
      ]);

    if (error) {
      // 23505 is PostgreSQL unique_violation code
      if (error.code === "23505" || error.message?.includes("uq_usage_ledger_user_event_idempotency")) {
        return { success: true }; // Already recorded, treat as success (idempotent)
      }
      console.error("[billing/usage] Error inserting usage ledger record:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error("[billing/usage] Error in recordUsage:", err);
    return { success: false, error: err.message || String(error) };
  }
}
