import assert from "node:assert/strict";
import { test } from "node:test";

import {
  handleCheckout,
  handlePortal,
  handleWebhook,
  type BillingCheckoutClient,
  type BillingPortalClient,
  type BillingWebhookAdminClient,
  type StripeBillingWebhookEvent,
} from "../lib/billing/routes";

type DbError = {
  code?: string;
  message?: string;
};

type Row = Record<string, unknown>;

type Call = {
  method: string;
  table: string;
  columns?: string;
  column?: string;
  value?: string | null;
  filter?: string;
  rows?: Row[];
  row?: Row;
};

function createPortalClient(data: Row | null, error: DbError | null = null): BillingPortalClient {
  const selectQuery = {
    select: () => selectQuery,
    eq: () => selectQuery,
    or: () => selectQuery,
    maybeSingle: async () => ({ data, error }),
    insert: async () => ({ error: null }),
    upsert: async () => ({ error: null }),
    update: () => ({
      eq: async () => ({ error: null }),
    }),
  };

  return {
    database: {
      from: () => selectQuery,
    },
    payments: {
      createCustomerPortalSession: async () => ({
        data: null,
        error: { message: "Customer portal unavailable." },
      }),
    },
  };
}

function createWebhookAdminClient({
  insertError = null,
  updateError = null,
  upsertError = null,
  selectResult = () => ({ data: null, error: null }),
}: {
  insertError?: DbError | null;
  updateError?: DbError | null;
  upsertError?: DbError | null;
  selectResult?: (table: string, calls: Call[]) => { data: Row | null; error: DbError | null };
} = {}): { client: BillingWebhookAdminClient; calls: Call[] } {
  const calls: Call[] = [];

  return {
    calls,
    client: {
      database: {
        from: (table: string) => {
          const selectQuery = {
            select: (columns: string) => {
              calls.push({ method: "select", table, columns });
              return selectQuery;
            },
            eq: (column: string, value: string | null) => {
              calls.push({ method: "eq", table, column, value });
              return selectQuery;
            },
            or: (filter: string) => {
              calls.push({ method: "or", table, filter });
              return selectQuery;
            },
            maybeSingle: async () => selectResult(table, calls),
          };

          return {
            ...selectQuery,
            insert: async (rows: Row[]) => {
              calls.push({ method: "insert", table, rows });
              return { error: insertError };
            },
            upsert: async (row: Row) => {
              calls.push({ method: "upsert", table, row });
              return { error: upsertError };
            },
            update: (row: Row) => ({
              eq: async (column: string, value: string | null) => {
                calls.push({ method: "update", table, row, column, value });
                return { error: updateError };
              },
            }),
          };
        },
      },
    },
  };
}

function checkoutEvent(): StripeBillingWebhookEvent {
  return {
    id: "evt_checkout",
    type: "checkout.session.completed",
    data: {
      object: {
        client_reference_id: "user-abc",
        customer: "cus_xyz",
        subscription: "sub_123",
      },
    },
  };
}

function subscriptionEvent(type: "customer.subscription.created" | "customer.subscription.updated"): StripeBillingWebhookEvent {
  return {
    id: `evt_${type}`,
    type,
    data: {
      object: {
        customer: "cus_xyz",
        id: "sub_123",
        status: "active",
        cancel_at_period_end: false,
        current_period_start: 1_782_783_200,
        current_period_end: 1_785_375_200,
        metadata: { userId: "user-meta" },
        items: { data: [{ price: { id: "price_pro_test" } }] },
      },
    },
  };
}

function invoiceEvent(type: "invoice.paid" | "invoice.payment_failed"): StripeBillingWebhookEvent {
  return {
    id: `evt_${type}`,
    type,
    data: {
      object: {
        customer: "cus_xyz",
        subscription: "sub_123",
      },
    },
  };
}

function findCall(calls: Call[], method: string, table: string): Call {
  const call = calls.find((item) => item.method === method && item.table === table);
  assert.ok(call, `expected ${method} on ${table}`);
  return call;
}

test("handleCheckout handles payments-disabled fallback gracefully", async () => {
  const mockInsforge: BillingCheckoutClient = {
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
  const result = await handlePortal({
    userId: "user-123",
    requestUrl: new URL("http://localhost:3000/api/billing/portal"),
    insforge: createPortalClient(null),
  });

  assert.equal(result.success, false);
  assert.match(result.error || "", /No active Stripe customer/);
});

test("handleWebhook processes checkout.session.completed", async () => {
  const { client, calls } = createWebhookAdminClient();

  const result = await handleWebhook({
    event: checkoutEvent(),
    insforgeAdmin: client,
  });

  assert.equal(result.received, true);
  assert.equal(result.status, "processed");

  const insertEvent = findCall(calls, "insert", "billing_webhook_events");
  assert.equal(insertEvent.rows?.[0].stripe_event_id, "evt_checkout");

  const upsertEntitlement = findCall(calls, "upsert", "user_entitlements");
  assert.equal(upsertEntitlement.row?.user_id, "user-abc");
  assert.equal(upsertEntitlement.row?.stripe_customer_id, "cus_xyz");
});

test("handleWebhook processes subscription created and updated events", async () => {
  for (const eventType of ["customer.subscription.created", "customer.subscription.updated"] as const) {
    const { client, calls } = createWebhookAdminClient({
      selectResult: (table) =>
        table === "user_entitlements"
          ? { data: { user_id: "user-db" }, error: null }
          : { data: null, error: null },
    });

    const result = await handleWebhook({
      event: subscriptionEvent(eventType),
      insforgeAdmin: client,
    });

    assert.equal(result.received, true);
    assert.equal(result.status, "processed");

    const lookup = findCall(calls, "or", "user_entitlements");
    assert.match(lookup.filter ?? "", /stripe_customer_id\.eq\.cus_xyz/);
    assert.match(lookup.filter ?? "", /stripe_subscription_id\.eq\.sub_123/);

    const upsertEntitlement = findCall(calls, "upsert", "user_entitlements");
    assert.equal(upsertEntitlement.row?.user_id, "user-db");
    assert.equal(upsertEntitlement.row?.plan_key, "pro");
    assert.equal(upsertEntitlement.row?.status, "active");
    assert.equal(
      upsertEntitlement.row?.current_period_start,
      new Date(1_782_783_200 * 1000).toISOString(),
    );
    assert.equal(
      upsertEntitlement.row?.current_period_end,
      new Date(1_785_375_200 * 1000).toISOString(),
    );
  }
});

test("handleWebhook processes subscription deletion", async () => {
  const { client, calls } = createWebhookAdminClient({
    selectResult: (table) =>
      table === "user_entitlements"
        ? { data: { user_id: "user-db" }, error: null }
        : { data: null, error: null },
  });

  const result = await handleWebhook({
    event: {
      id: "evt_deleted",
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_xyz", id: "sub_123" } },
    },
    insforgeAdmin: client,
  });

  assert.equal(result.received, true);
  assert.equal(result.status, "processed");

  const update = calls.find(
    (call) =>
      call.method === "update" &&
      call.table === "user_entitlements" &&
      call.row?.plan_key === "free",
  );
  assert.ok(update);
  assert.equal(update.row?.status, "canceled");
  assert.equal(update.row?.current_period_start, null);
  assert.equal(update.row?.current_period_end, null);
});

test("handleWebhook processes invoice paid and payment_failed events", async () => {
  const cases = [
    { event: invoiceEvent("invoice.paid"), status: "active" },
    { event: invoiceEvent("invoice.payment_failed"), status: "past_due" },
  ];

  for (const item of cases) {
    const { client, calls } = createWebhookAdminClient({
      selectResult: (table) =>
        table === "user_entitlements"
          ? { data: { user_id: "user-db" }, error: null }
          : { data: null, error: null },
    });

    const result = await handleWebhook({
      event: item.event,
      insforgeAdmin: client,
    });

    assert.equal(result.received, true);
    assert.equal(result.status, "processed");

    const update = calls.find(
      (call) =>
        call.method === "update" &&
        call.table === "user_entitlements" &&
        call.row?.status === item.status,
    );
    assert.ok(update);
  }
});

test("handleWebhook treats already processed duplicate events as idempotent", async () => {
  const { client, calls } = createWebhookAdminClient({
    insertError: { code: "23505", message: "duplicate key" },
    selectResult: (table) =>
      table === "billing_webhook_events"
        ? { data: { processing_status: "processed" }, error: null }
        : { data: null, error: null },
  });

  const result = await handleWebhook({
    event: checkoutEvent(),
    insforgeAdmin: client,
  });

  assert.equal(result.received, true);
  assert.equal(result.status, "ignored");
  assert.equal(result.duplicate, true);
  assert.equal(calls.some((call) => call.method === "upsert"), false);
});

test("handleWebhook reclaims stale pending webhook events", async () => {
  const staleProcessedAt = new Date(Date.now() - 11 * 60 * 1000).toISOString();
  const { client, calls } = createWebhookAdminClient({
    insertError: { code: "23505", message: "duplicate key" },
    selectResult: (table) =>
      table === "billing_webhook_events"
        ? {
            data: {
              processing_status: "pending",
              processed_at: staleProcessedAt,
            },
            error: null,
          }
        : { data: null, error: null },
  });

  const result = await handleWebhook({
    event: checkoutEvent(),
    insforgeAdmin: client,
  });

  assert.equal(result.received, true);
  assert.equal(result.status, "processed");

  const reclaim = calls.find(
    (call) =>
      call.method === "update" &&
      call.table === "billing_webhook_events" &&
      call.row?.processing_status === "pending",
  );
  assert.ok(reclaim);

  const upsertEntitlement = findCall(calls, "upsert", "user_entitlements");
  assert.equal(upsertEntitlement.row?.user_id, "user-abc");
});
