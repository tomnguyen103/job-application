import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";

import { verifyStripeSignature } from "../lib/billing/verify-webhook-signature";

const SECRET = "whsec_test_secret";

function sign(body: string, timestamp: number, secret = SECRET): string {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

test("verifyStripeSignature accepts a correctly signed payload", () => {
  const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const timestamp = Math.floor(Date.now() / 1000);
  const header = sign(body, timestamp);

  const result = verifyStripeSignature(body, header, SECRET);

  assert.equal(result.valid, true);
});

test("verifyStripeSignature rejects a missing signature header", () => {
  const result = verifyStripeSignature("{}", null, SECRET);

  assert.equal(result.valid, false);
  assert.match(result.error || "", /Missing/);
});

test("verifyStripeSignature rejects when the secret is not configured", () => {
  const body = "{}";
  const timestamp = Math.floor(Date.now() / 1000);
  const header = sign(body, timestamp);

  const result = verifyStripeSignature(body, header, "");

  assert.equal(result.valid, false);
  assert.match(result.error || "", /secret/i);
});

test("verifyStripeSignature rejects a malformed signature header", () => {
  const result = verifyStripeSignature("{}", "not-a-valid-header", SECRET);

  assert.equal(result.valid, false);
  assert.match(result.error || "", /Malformed/);
});

test("verifyStripeSignature rejects a tampered body", () => {
  const originalBody = JSON.stringify({ id: "evt_1", amount: 100 });
  const timestamp = Math.floor(Date.now() / 1000);
  const header = sign(originalBody, timestamp);

  const tamperedBody = JSON.stringify({ id: "evt_1", amount: 999999 });
  const result = verifyStripeSignature(tamperedBody, header, SECRET);

  assert.equal(result.valid, false);
  assert.match(result.error || "", /mismatch/i);
});

test("verifyStripeSignature rejects a signature signed with the wrong secret", () => {
  const body = "{}";
  const timestamp = Math.floor(Date.now() / 1000);
  const header = sign(body, timestamp, "whsec_wrong_secret");

  const result = verifyStripeSignature(body, header, SECRET);

  assert.equal(result.valid, false);
});

test("verifyStripeSignature rejects a stale (replayed) timestamp", () => {
  const body = "{}";
  const staleTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes old
  const header = sign(body, staleTimestamp);

  const result = verifyStripeSignature(body, header, SECRET);

  assert.equal(result.valid, false);
  assert.match(result.error || "", /tolerance/i);
});

test("verifyStripeSignature forged body cannot forge a valid signature without the secret", () => {
  // Simulates an attacker who knows the event shape but not the signing secret.
  const forgedBody = JSON.stringify({
    id: "evt_fake_1",
    type: "customer.subscription.updated",
    data: { object: { status: "active", metadata: { userId: "victim-user-id" } } },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const guessedSignature = createHmac("sha256", "guessed-secret")
    .update(`${timestamp}.${forgedBody}`, "utf8")
    .digest("hex");

  const result = verifyStripeSignature(
    forgedBody,
    `t=${timestamp},v1=${guessedSignature}`,
    SECRET,
  );

  assert.equal(result.valid, false);
});
