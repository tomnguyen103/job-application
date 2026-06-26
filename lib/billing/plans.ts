export type BillingEventType =
  | "job_search_run"
  | "job_match_score"
  | "company_research_run"
  | "tailored_resume_generate"
  | "base_resume_generate"
  | "resume_extract";

export interface PlanQuota {
  limit: number;
  displayName: string;
}

export interface BillingPlan {
  planKey: "free" | "pro";
  displayName: string;
  priceId: string | null;
  priceAmount: number;
  quotas: Record<BillingEventType, PlanQuota>;
}

export interface UserEntitlement {
  planKey: "free" | "pro";
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export const BILLING_PLANS: Record<"free" | "pro", BillingPlan> = {
  free: {
    planKey: "free",
    displayName: "Free",
    priceId: null,
    priceAmount: 0,
    quotas: {
      job_search_run: { limit: 3, displayName: "Job searches" },
      job_match_score: { limit: 30, displayName: "AI-scored job matches" },
      company_research_run: { limit: 2, displayName: "Company research runs" },
      tailored_resume_generate: { limit: 2, displayName: "Job-tailored resumes" },
      base_resume_generate: { limit: 2, displayName: "Base resume generations" },
      resume_extract: { limit: 2, displayName: "Resume extractions" },
    },
  },
  pro: {
    planKey: "pro",
    displayName: "Pro",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_pro_test",
    priceAmount: 9,
    quotas: {
      job_search_run: { limit: 50, displayName: "Job searches" },
      job_match_score: { limit: 500, displayName: "AI-scored job matches" },
      company_research_run: { limit: 25, displayName: "Company research runs" },
      tailored_resume_generate: { limit: 30, displayName: "Job-tailored resumes" },
      base_resume_generate: { limit: 10, displayName: "Base resume generations" },
      resume_extract: { limit: 10, displayName: "Resume extractions" },
    },
  },
};

/**
 * Calculates the start and end boundaries of the current billing period.
 * For Pro users, this relies on the subscription start and end dates from Stripe.
 * For Free users, it defaults to the calendar month boundary.
 * 
 * @param entitlement - The user's active billing entitlement.
 * @returns An object containing the start and end Date objects for the current period.
 */
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

