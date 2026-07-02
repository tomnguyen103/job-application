export interface UserEntitlement {
  planKey: "free" | "pro";
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export type UserEntitlementRow = {
  plan_key?: string | null;
  status?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

const DEFAULT_FREE_ENTITLEMENT: UserEntitlement = {
  planKey: "free",
  status: "active",
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
};

function isDowngradableStatus(status: string): boolean {
  return status === "past_due" || status === "canceled" || status === "unpaid";
}

export function resolveEntitlement(
  row: UserEntitlementRow | null,
  now = new Date(),
): UserEntitlement {
  if (!row) {
    return { ...DEFAULT_FREE_ENTITLEMENT };
  }

  const currentPeriodEnd = row.current_period_end ? new Date(row.current_period_end) : null;
  let planKey: "free" | "pro" = row.plan_key === "pro" ? "pro" : "free";
  let status = row.status || "active";

  if (planKey === "pro" && currentPeriodEnd && !Number.isNaN(currentPeriodEnd.getTime())) {
    const gracePeriodEnd = new Date(currentPeriodEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
    if (now > gracePeriodEnd && isDowngradableStatus(status)) {
      planKey = "free";
      status = "active";
    }
  }

  return {
    planKey,
    status,
    currentPeriodStart: row.current_period_start ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
  };
}

/**
 * Fetches and resolves the billing entitlement for a given user from the database.
 * If the user does not have a record, defaults to the Free plan.
 * Handles grace period checking and automatically downgrades past_due/canceled
 * subscriptions if they are past the 3-day grace period.
 * 
 * @param userId - The unique identifier of the user.
 * @returns The resolved UserEntitlement object.
 */
export async function getUserEntitlement(userId: string): Promise<UserEntitlement> {
  try {
    const { createInsforgeServer } = await import("@/lib/insforge-server");
    const insforge = await createInsforgeServer();
    const { data, error } = await insforge.database
      .from("user_entitlements")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[billing/entitlements] Error fetching user entitlement:", error);
      return { ...DEFAULT_FREE_ENTITLEMENT };
    }

    return resolveEntitlement(data as UserEntitlementRow | null);
  } catch (error) {
    console.error("[billing/entitlements] Error in getUserEntitlement:", error);
    return { ...DEFAULT_FREE_ENTITLEMENT };
  }
}
