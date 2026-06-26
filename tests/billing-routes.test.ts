/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { test } from "node:test";

import { handleCheckout, handlePortal, handleWebhook } from "../lib/billing/routes";

// Helper to create mock database client
function createMockDbClient(data: any, error: any = null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data, error }),
        }),
      }),
      insert: async () => ({ error }),
      upsert: async () => ({ error }),
      update: () => ({
        eq: async () => ({ error }),
      }),
    }),
  };
}

test("handleCheckout handles payments-disabled fallback gracefully", async () => {
  const mockInsforge = {
    payments: {
      createCheckoutSession: async () => ({
        data: null,
        error: { message: "Payments are not available on this backend." },
      }),
    },
  };

  const result = await handleCheckout({
    userId: "user-123",
    userEmail: "test@example.com",
    requestUrl: new URL("http://localhost:3000/api/billing/checkout"),
    insforge: mockInsforge,
  });

  assert.equal(result.success, false);
  assert.equal(result.fallback, true);
  assert.match(result.error || "", /Payments are not/);
});

test("handlePortal returns error when no Stripe customer exists", async () => {
  const mockInsforge = {
    database: createMockDbClient(null), // no entitlement row
  };

  const result = await handlePortal({
    userId: "user-123",
    requestUrl: new URL("http://localhost:3000/api/billing/portal"),
    insforge: mockInsforge,
  });

  assert.equal(result.success, false);
  assert.match(result.error || "", /No active Stripe customer/);
});

test("handleWebhook processes checkout.session.completed", async () => {
  const dbCalls: any[] = [];
  const mockInsforgeAdmin = {
    database: {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              dbCalls.push({ method: "select", table });
              return { data: null, error: null }; // no existing event
            },
          }),
        }),
        insert: async (rows: any[]) => {
          dbCalls.push({ method: "insert", table, rows });
          return { error: null };
        },
        upsert: async (row: any) => {
          dbCalls.push({ method: "upsert", table, row });
          return { error: null };
        },
        update: () => ({
          eq: async () => {
            dbCalls.push({ method: "update", table });
            return { error: null };
          },
        }),
      }),
    },
  };

  const payload = {
    id: "evt_test_123",
    type: "checkout.session.completed",
    data: {
      object: {
        client_reference_id: "user-abc",
        customer: "cus_xyz",
        subscription: "sub_123",
      },
    },
  };

  const result = await handleWebhook({
    event: payload,
    insforgeAdmin: mockInsforgeAdmin,
  });

  assert.equal(result.received, true);
  assert.equal(result.status, "processed");

  // Verify database inserts/upserts were called
  const insertEvent = dbCalls.find(c => c.table === "billing_webhook_events" && c.method === "insert");
  assert.ok(insertEvent);
  assert.equal(insertEvent.rows[0].stripe_event_id, "evt_test_123");

  const upsertEntitlement = dbCalls.find(c => c.table === "user_entitlements" && c.method === "upsert");
  assert.ok(upsertEntitlement);
  assert.equal(upsertEntitlement.row.user_id, "user-abc");
  assert.equal(upsertEntitlement.row.stripe_customer_id, "cus_xyz");
});
