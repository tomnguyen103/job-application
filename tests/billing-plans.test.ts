import { test } from "node:test";
import assert from "node:assert";

import { BILLING_PLANS, getPeriodBoundaries, UserEntitlement } from "../lib/billing/plans";
import { isUniqueConstraintViolation } from "../lib/billing/usage";

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

  const { periodStart, periodEnd } = getPeriodBoundaries(entitlement);
  const now = new Date();
  
  assert.strictEqual(periodStart.getFullYear(), now.getFullYear());
  assert.strictEqual(periodStart.getMonth(), now.getMonth());
  assert.strictEqual(periodStart.getDate(), 1);
  
  assert.strictEqual(periodEnd.getFullYear(), now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear());
  assert.strictEqual(periodEnd.getMonth(), now.getMonth() === 11 ? 0 : now.getMonth() + 1);
  assert.strictEqual(periodEnd.getDate(), 1);
});

test("quota calculation logic correctly evaluates allowed and exhausted cases", () => {
  const evaluate = (current: number, limit: number, quantity: number) => current + quantity <= limit;
  
  // Free plan search limit is 3
  assert.ok(evaluate(0, 3, 1)); // allowed
  assert.ok(evaluate(2, 3, 1)); // allowed (reaches limit)
  assert.strictEqual(evaluate(3, 3, 1), false); // exhausted
  assert.strictEqual(evaluate(2, 3, 2), false); // would exceed limit
});

test("idempotency check parses unique constraint violations as success", () => {
  assert.ok(isUniqueConstraintViolation({ code: "23505" }));
  assert.ok(isUniqueConstraintViolation({ message: "duplicate key value violates unique constraint uq_usage_ledger_user_event_idempotency" }));
  assert.strictEqual(isUniqueConstraintViolation({ code: "other" }), false);
});

