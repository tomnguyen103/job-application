import { test } from "node:test";
import assert from "node:assert";

import { BILLING_PLANS, getPeriodBoundaries, UserEntitlement } from "../lib/billing/plans";
import {
  checkQuotaAvailable,
  getCurrentPeriodUsage,
  type BillingUsageClient,
} from "../lib/billing/usage";
import { isUniqueConstraintViolation } from "../lib/billing/usage-errors";

type UsageRow = {
  event_type: string;
  quantity: number;
};

function usageClient(rows: UsageRow[], error: { message?: string } | null = null): BillingUsageClient {
  const query = {
    select: () => query,
    eq: () => query,
    gte: () => query,
    lt: async () => ({ data: rows, error }),
  };

  return {
    database: {
      from: () => query,
    },
  };
}

test("BILLING_PLANS contains free and pro definitions", () => {
  assert.ok(BILLING_PLANS.free);
  assert.ok(BILLING_PLANS.pro);
  
  assert.strictEqual(BILLING_PLANS.free.planKey, "free");
  assert.strictEqual(BILLING_PLANS.pro.planKey, "pro");
  
  assert.strictEqual(BILLING_PLANS.free.priceId, null);
  assert.strictEqual(BILLING_PLANS.free.priceAmount, 0);
  assert.strictEqual(BILLING_PLANS.pro.priceAmount, 9);
});

test("BILLING_PLANS defines correct quotas", () => {
  const freeQuotas = BILLING_PLANS.free.quotas;
  const proQuotas = BILLING_PLANS.pro.quotas;

  assert.strictEqual(freeQuotas.job_search_run.limit, 3);
  assert.strictEqual(proQuotas.job_search_run.limit, 50);

  assert.strictEqual(freeQuotas.job_match_score.limit, 30);
  assert.strictEqual(proQuotas.job_match_score.limit, 500);

  assert.strictEqual(freeQuotas.company_research_run.limit, 2);
  assert.strictEqual(proQuotas.company_research_run.limit, 25);
  
  assert.strictEqual(freeQuotas.tailored_resume_generate.limit, 2);
  assert.strictEqual(proQuotas.tailored_resume_generate.limit, 30);
});

test("getPeriodBoundaries resolves pro period correctly", () => {
  const entitlement: UserEntitlement = {
    planKey: "pro",
    status: "active",
    currentPeriodStart: "2026-06-10T12:00:00Z",
    currentPeriodEnd: "2026-07-10T12:00:00Z",
    cancelAtPeriodEnd: false,
    stripeCustomerId: "cus_123",
    stripeSubscriptionId: "sub_123",
  };

  const { periodStart, periodEnd } = getPeriodBoundaries(entitlement);
  assert.strictEqual(periodStart.toISOString(), "2026-06-10T12:00:00.000Z");
  assert.strictEqual(periodEnd.toISOString(), "2026-07-10T12:00:00.000Z");
});

test("getPeriodBoundaries falls back to calendar month for free plan", () => {
  const entitlement: UserEntitlement = {
    planKey: "free",
    status: "active",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };

  const now = new Date("2026-07-15T12:00:00Z");
  const { periodStart, periodEnd } = getPeriodBoundaries(entitlement, now);
  
  assert.strictEqual(periodStart.getFullYear(), now.getFullYear());
  assert.strictEqual(periodStart.getMonth(), now.getMonth());
  assert.strictEqual(periodStart.getDate(), 1);
  
  assert.strictEqual(periodEnd.getFullYear(), now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear());
  assert.strictEqual(periodEnd.getMonth(), now.getMonth() === 11 ? 0 : now.getMonth() + 1);
  assert.strictEqual(periodEnd.getDate(), 1);
});

test("getPeriodBoundaries falls back when pro dates are invalid or reversed", () => {
  const entitlement: UserEntitlement = {
    planKey: "pro",
    status: "active",
    currentPeriodStart: "2026-08-01T00:00:00Z",
    currentPeriodEnd: "2026-07-01T00:00:00Z",
    cancelAtPeriodEnd: false,
    stripeCustomerId: "cus_123",
    stripeSubscriptionId: "sub_123",
  };

  const { periodStart, periodEnd } = getPeriodBoundaries(
    entitlement,
    new Date("2026-07-15T12:00:00Z"),
  );

  assert.strictEqual(periodStart.getFullYear(), 2026);
  assert.strictEqual(periodStart.getMonth(), 6);
  assert.strictEqual(periodStart.getDate(), 1);
  assert.strictEqual(periodEnd.getFullYear(), 2026);
  assert.strictEqual(periodEnd.getMonth(), 7);
  assert.strictEqual(periodEnd.getDate(), 1);
});

test("getCurrentPeriodUsage sums real usage ledger rows by event type", async () => {
  const entitlement: UserEntitlement = {
    planKey: "free",
    status: "active",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };

  const usage = await getCurrentPeriodUsage("user-123", entitlement, {
    insforge: usageClient([
      { event_type: "job_search_run", quantity: 1 },
      { event_type: "job_search_run", quantity: 2 },
      { event_type: "resume_extract", quantity: 1 },
      { event_type: "unknown", quantity: 99 },
    ]),
  });

  assert.strictEqual(usage.job_search_run, 3);
  assert.strictEqual(usage.resume_extract, 1);
  assert.strictEqual(usage.company_research_run, 0);
});

test("checkQuotaAvailable evaluates real current usage and fails closed", async () => {
  const freeEntitlement: UserEntitlement = {
    planKey: "free",
    status: "active",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };

  const allowed = await checkQuotaAvailable("user-123", "job_search_run", 1, {
    getEntitlement: async () => freeEntitlement,
    insforge: usageClient([{ event_type: "job_search_run", quantity: 2 }]),
  });

  assert.deepStrictEqual(allowed, {
    allowed: true,
    limit: 3,
    current: 2,
    planKey: "free",
  });

  const exhausted = await checkQuotaAvailable("user-123", "job_search_run", 1, {
    getEntitlement: async () => freeEntitlement,
    insforge: usageClient([{ event_type: "job_search_run", quantity: 3 }]),
  });

  assert.deepStrictEqual(exhausted, {
    allowed: false,
    limit: 3,
    current: 3,
    planKey: "free",
  });

  const failed = await checkQuotaAvailable("user-123", "job_search_run", 1, {
    getEntitlement: async () => {
      throw new Error("entitlement outage");
    },
  });

  assert.deepStrictEqual(failed, {
    allowed: false,
    limit: 0,
    current: 0,
    planKey: "free",
  });
});

test("idempotency check parses unique constraint violations as success", () => {
  assert.ok(isUniqueConstraintViolation({ code: "23505" }));
  assert.ok(isUniqueConstraintViolation({ message: "duplicate key value violates unique constraint uq_usage_ledger_user_event_idempotency" }));
  assert.strictEqual(isUniqueConstraintViolation({ code: "other" }), false);
});

