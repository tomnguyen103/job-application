export type BillingEventType =
  | "job_search_run"
  | "job_match_score"
  | "company_research_run"
  | "tailored_resume_generate"
  | "base_resume_generate"
  | "resume_extract";

export type BillingPlanKey = "free" | "pro";

export interface PlanQuota {
  limit: number;
  displayName: string;
}

export interface BillingPlan {
  planKey: BillingPlanKey;
  displayName: string;
  priceId: string | null;
  priceAmount: number;
  quotas: Record<BillingEventType, PlanQuota>;
}

export interface UserEntitlement {
  planKey: BillingPlanKey;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export type PlanQuotaRow = {
  planKey: BillingPlanKey;
  eventType: BillingEventType;
  limit: number;
  displayName: string;
};

export const PLAN_QUOTA_ROWS: readonly PlanQuotaRow[] = [
  {
    planKey: "free",
    eventType: "job_search_run",
    limit: 3,
    displayName: "Job searches",
  },
  {
    planKey: "free",
    eventType: "job_match_score",
    limit: 30,
    displayName: "AI-scored job matches",
  },
  {
    planKey: "free",
    eventType: "company_research_run",
    limit: 2,
    displayName: "Company research runs",
  },
  {
    planKey: "free",
    eventType: "tailored_resume_generate",
    limit: 2,
    displayName: "Job-tailored resumes",
  },
  {
    planKey: "free",
    eventType: "base_resume_generate",
    limit: 2,
    displayName: "Base resume generations",
  },
  {
    planKey: "free",
    eventType: "resume_extract",
    limit: 2,
    displayName: "Resume extractions",
  },
  {
    planKey: "pro",
    eventType: "job_search_run",
    limit: 50,
    displayName: "Job searches",
  },
  {
    planKey: "pro",
    eventType: "job_match_score",
    limit: 500,
    displayName: "AI-scored job matches",
  },
  {
    planKey: "pro",
    eventType: "company_research_run",
    limit: 25,
    displayName: "Company research runs",
  },
  {
    planKey: "pro",
    eventType: "tailored_resume_generate",
    limit: 30,
    displayName: "Job-tailored resumes",
  },
  {
    planKey: "pro",
    eventType: "base_resume_generate",
    limit: 10,
    displayName: "Base resume generations",
  },
  {
    planKey: "pro",
    eventType: "resume_extract",
    limit: 10,
    displayName: "Resume extractions",
  },
];

function quotasFor(planKey: BillingPlanKey): Record<BillingEventType, PlanQuota> {
  return Object.fromEntries(
    PLAN_QUOTA_ROWS
      .filter((row) => row.planKey === planKey)
      .map((row) => [
        row.eventType,
        {
          limit: row.limit,
          displayName: row.displayName,
        },
      ]),
  ) as Record<BillingEventType, PlanQuota>;
}

export const BILLING_PLANS: Record<BillingPlanKey, BillingPlan> = {
  free: {
    planKey: "free",
    displayName: "Free",
    priceId: null,
    priceAmount: 0,
    quotas: quotasFor("free"),
  },
  pro: {
    planKey: "pro",
    displayName: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro_test",
    priceAmount: 9,
    quotas: quotasFor("pro"),
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
function calendarMonthBoundaries(now: Date): { periodStart: Date; periodEnd: Date } {
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { periodStart, periodEnd };
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

export function getPeriodBoundaries(
  entitlement: UserEntitlement,
  now = new Date(),
): { periodStart: Date; periodEnd: Date } {
  if (entitlement.planKey === "pro" && entitlement.currentPeriodStart && entitlement.currentPeriodEnd) {
    const periodStart = new Date(entitlement.currentPeriodStart);
    const periodEnd = new Date(entitlement.currentPeriodEnd);

    if (isValidDate(periodStart) && isValidDate(periodEnd) && periodStart < periodEnd) {
      return { periodStart, periodEnd };
    }
  }

  return calendarMonthBoundaries(now);
}

