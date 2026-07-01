import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveEntitlement, type UserEntitlementRow } from "../lib/billing/entitlements";

const periodEnd = "2026-07-10T12:00:00Z";

function row(status: string): UserEntitlementRow {
  return {
    plan_key: "pro",
    status,
    current_period_start: "2026-06-10T12:00:00Z",
    current_period_end: periodEnd,
    cancel_at_period_end: false,
    stripe_customer_id: "cus_123",
    stripe_subscription_id: "sub_123",
  };
}

test("resolveEntitlement preserves pro through the grace boundary", () => {
  for (const now of [
    new Date(periodEnd),
    new Date("2026-07-13T12:00:00Z"),
  ]) {
    const entitlement = resolveEntitlement(row("past_due"), now);

    assert.equal(entitlement.planKey, "pro");
    assert.equal(entitlement.status, "past_due");
  }
});

test("resolveEntitlement downgrades stale unpaid pro statuses after grace", () => {
  for (const status of ["past_due", "canceled", "unpaid"]) {
    const entitlement = resolveEntitlement(
      row(status),
      new Date("2026-07-13T12:00:01Z"),
    );

    assert.equal(entitlement.planKey, "free");
    assert.equal(entitlement.status, "active");
  }
});

test("resolveEntitlement does not downgrade active pro after grace", () => {
  const entitlement = resolveEntitlement(
    row("active"),
    new Date("2026-07-13T12:00:01Z"),
  );

  assert.equal(entitlement.planKey, "pro");
  assert.equal(entitlement.status, "active");
});

test("resolveEntitlement returns a free entitlement for missing rows", () => {
  const entitlement = resolveEntitlement(null, new Date("2026-07-13T12:00:01Z"));

  assert.equal(entitlement.planKey, "free");
  assert.equal(entitlement.status, "active");
  assert.equal(entitlement.currentPeriodEnd, null);
});
