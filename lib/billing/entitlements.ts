import { createInsforgeServer } from "@/lib/insforge-server";

export interface UserEntitlement {
  planKey: "free" | "pro";
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
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
  const defaultFree: UserEntitlement = {
    planKey: "free",
    status: "active",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };

  try {
    const insforge = await createInsforgeServer();
    const { data, error } = await insforge.database
      .from("user_entitlements")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[billing/entitlements] Error fetching user entitlement:", error);
      return defaultFree;
    }

    if (!data) {
      return defaultFree;
    }

    // Downgrade check: if plan is pro but period has ended and status is past_due/canceled
    // or if current_period_end is set and we've passed it by more than 3 days (grace period)
    const now = new Date();
    const currentPeriodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
    
    let planKey = data.plan_key as "free" | "pro";
    let status = data.status;

    if (planKey === "pro" && currentPeriodEnd) {
      const gracePeriodEnd = new Date(currentPeriodEnd.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days grace
      if (now > gracePeriodEnd && (status === "past_due" || status === "canceled" || status === "unpaid")) {
        planKey = "free";
        status = "active";
      }
    }

    return {
      planKey,
      status,
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
    };
  } catch (error) {
    console.error("[billing/entitlements] Error in getUserEntitlement:", error);
    return defaultFree;
  }
}
