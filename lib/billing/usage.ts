import { BILLING_PLANS, BillingEventType, getPeriodBoundaries } from "./plans";
import { getUserEntitlement, UserEntitlement } from "./entitlements";
import { isUniqueConstraintViolation } from "./usage-errors";

export { isUniqueConstraintViolation } from "./usage-errors";

type BillingUsageError = {
  message?: string;
};

type UsageLedgerRow = {
  event_type?: string | null;
  quantity?: number | null;
};

type UsageLedgerQuery = {
  select(columns: string): UsageLedgerQuery;
  eq(column: string, value: string): UsageLedgerQuery;
  gte(column: string, value: string): UsageLedgerQuery;
  lt(column: string, value: string): Promise<{
    data: UsageLedgerRow[] | null;
    error: BillingUsageError | null;
  }>;
};

export type BillingUsageClient = {
  database: {
    from(table: "usage_ledger"): UsageLedgerQuery;
  };
};

export type QuotaCheckResult = {
  allowed: boolean;
  limit: number;
  current: number;
  planKey: "free" | "pro";
};

export type RecordUsageResult = {
  success: boolean;
  error?: string;
  code?: string;
  idempotent?: boolean;
  current?: number;
  limit?: number;
  planKey?: "free" | "pro";
};

export type BillingUsageRpcClient = {
  database: {
    rpc(
      functionName: string,
      args: Record<string, unknown>,
    ): Promise<{ data: unknown; error: BillingUsageError | null }>;
  };
};

export type UsageFailureHttpResult = {
  status: 402 | 500;
  body: {
    success: false;
    error: string;
    code?: "QUOTA_EXCEEDED";
    eventType?: BillingEventType;
    current?: number;
    limit?: number;
    planKey?: "free" | "pro";
  };
};

type QuotaCheckOptions = {
  insforge?: BillingUsageClient;
  getEntitlement?: (userId: string) => Promise<UserEntitlement>;
};

export function usageFailureToHttpResult(
  eventType: BillingEventType,
  result: RecordUsageResult,
  fallbackError: string,
): UsageFailureHttpResult {
  if (result.code === "QUOTA_EXCEEDED") {
    return {
      status: 402,
      body: {
        success: false,
        error: result.error ?? `Quota exceeded for ${eventType}.`,
        code: "QUOTA_EXCEEDED",
        eventType,
        current: result.current,
        limit: result.limit,
        planKey: result.planKey,
      },
    };
  }

  return {
    status: 500,
    body: {
      success: false,
      error: fallbackError,
    },
  };
}

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
 * Computes the total usage quantity recorded for each billing event type
 * within the user's current billing period.
 * 
 * @param userId - The unique identifier of the user.
 * @param entitlement - The user's active billing entitlement.
 * @returns A record mapping event types to their accumulated usage counts.
 * @throws Error if the database query fails.
 */
export async function getCurrentPeriodUsage(
  userId: string,
  entitlement: UserEntitlement,
  options: { insforge?: BillingUsageClient } = {},
): Promise<Record<BillingEventType, number>> {
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
    let insforge = options.insforge;
    if (!insforge) {
      const { createInsforgeServer } = await import("@/lib/insforge-server");
      insforge = await createInsforgeServer() as unknown as BillingUsageClient;
    }

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
          usage[type] += row.quantity ?? 0;
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
  quantity: number = 1,
  options: QuotaCheckOptions = {},
): Promise<QuotaCheckResult> {
  try {
    const resolveEntitlement = options.getEntitlement ?? getUserEntitlement;
    const entitlement = await resolveEntitlement(userId);
    const plan = BILLING_PLANS[entitlement.planKey];
    const limit = plan.quotas[eventType].limit;

    const usage = await getCurrentPeriodUsage(userId, entitlement, {
      insforge: options.insforge,
    });
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
export async function assertQuotaAvailable(
  userId: string,
  eventType: BillingEventType,
  quantity: number = 1,
  options: QuotaCheckOptions = {},
): Promise<void> {
  const check = await checkQuotaAvailable(userId, eventType, quantity, options);
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
): Promise<RecordUsageResult> {
  try {
    // Usage writes go through SECURITY DEFINER RPCs that validate auth.uid()
    // against p_user_id and derive quota bounds inside the database.
    const { createInsforgeServer } = await import("@/lib/insforge-server");
    const insforge = await createInsforgeServer();

    const { data, error } = await insforge.database.rpc("record_usage_with_quota_check", {
      p_user_id: userId,
      p_event_type: eventType,
      p_quantity: quantity,
      p_idempotency_key: idempotencyKey,
      // Compatibility fields only. The RPC ignores these and derives quota
      // limits and periods from server-owned entitlement rows.
      p_limit: null,
      p_period_start: null,
      p_period_end: null,
      p_source_route: sourceRoute || null,
      p_reference_id: referenceId || null,
      p_metadata: metadata,
    });

    if (error) {
      if (isUniqueConstraintViolation(error)) {
        return { success: true, idempotent: true };
      }
      console.error("[billing/usage] RPC Error in recordUsage:", error);
      return { success: false, error: error.message };
    }

    const result = data as {
      success: boolean;
      status: string;
      current?: number;
      limit?: number;
      plan_key?: "free" | "pro";
    } | null;
    if (!result) {
      return { success: false, error: "No response from database RPC." };
    }

    if (!result.success) {
      if (result.status === "quota_exceeded") {
        return {
          success: false,
          code: "QUOTA_EXCEEDED",
          error: `Quota exceeded for ${eventType}. Current usage: ${result.current}, Limit: ${result.limit}.`,
          current: result.current,
          limit: result.limit,
          planKey: result.plan_key ?? "free",
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

export async function releaseResumeExtractReservation(
  userId: string,
  idempotencyKey: string,
  options: { insforge?: BillingUsageRpcClient } = {},
): Promise<RecordUsageResult> {
  try {
    let insforge = options.insforge;
    if (!insforge) {
      const { createInsforgeServer } = await import("@/lib/insforge-server");
      insforge = await createInsforgeServer() as unknown as BillingUsageRpcClient;
    }

    const { data, error } = await insforge.database.rpc("release_resume_extract_reservation", {
      p_user_id: userId,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      console.error("[billing/usage] RPC Error in releaseResumeExtractReservation:", error);
      return { success: false, error: error.message };
    }

    const result = data as { success?: boolean; status?: string } | null;
    if (!result?.success) {
      return { success: false, error: `Failed to release resume extract reservation: ${result?.status ?? "unknown"}` };
    }

    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error("[billing/usage] Error in releaseResumeExtractReservation:", err);
    return { success: false, error: err.message || String(error) };
  }
}

export async function releaseBaseResumeGenerationReservation(
  userId: string,
  idempotencyKey: string,
  releaseToken: string,
  options: { insforge?: BillingUsageRpcClient } = {},
): Promise<RecordUsageResult> {
  try {
    let insforge = options.insforge;
    if (!insforge) {
      const { createInsforgeServer } = await import("@/lib/insforge-server");
      insforge = await createInsforgeServer() as unknown as BillingUsageRpcClient;
    }

    const { data, error } = await insforge.database.rpc("release_base_resume_generation_reservation", {
      p_user_id: userId,
      p_idempotency_key: idempotencyKey,
      p_release_token: releaseToken,
    });

    if (error) {
      console.error("[billing/usage] RPC Error in releaseBaseResumeGenerationReservation:", error);
      return { success: false, error: error.message };
    }

    const result = data as { success?: boolean; status?: string } | null;
    if (!result?.success) {
      return { success: false, error: `Failed to release base resume generation reservation: ${result?.status ?? "unknown"}` };
    }

    return { success: true, idempotent: result.status === "idempotent" };
  } catch (error) {
    const err = error as Error;
    console.error("[billing/usage] Error in releaseBaseResumeGenerationReservation:", err);
    return { success: false, error: err.message || String(error) };
  }
}
