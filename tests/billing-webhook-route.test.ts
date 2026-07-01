import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, test } from "node:test";

import { POST } from "../app/api/billing/webhook/route";

const SECRET = "whsec_route_test_secret";
const ORIGINAL_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

afterEach(() => {
  if (ORIGINAL_WEBHOOK_SECRET === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    return;
  }

  process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_WEBHOOK_SECRET;
});

function sign(body: string, timestamp: number): string {
  const signature = createHmac("sha256", SECRET)
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function request(body: string, signature?: string): Request {
  return new Request("http://localhost:3000/api/billing/webhook", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    body,
  });
}

test("billing webhook route rejects unsigned requests before parsing the event", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;

  const response = await POST(request("{not-json"));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, { error: "Invalid signature" });
});

test("billing webhook route rejects a forged Stripe signature", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  const body = JSON.stringify({
    id: "evt_forged",
    type: "customer.subscription.updated",
    data: { object: { metadata: { userId: "victim" } } },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const forgedSignature = createHmac("sha256", "wrong-secret")
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");

  const response = await POST(request(body, `t=${timestamp},v1=${forgedSignature}`));
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(payload, { error: "Invalid signature" });
});

test("billing webhook route requires valid signed JSON before webhook handling", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  const body = "{not-json";
  const timestamp = Math.floor(Date.now() / 1000);

  const response = await POST(request(body, sign(body, timestamp)));
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(payload, { error: "Invalid JSON" });
});
