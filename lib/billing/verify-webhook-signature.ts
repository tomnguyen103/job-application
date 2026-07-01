import { createHmac, timingSafeEqual } from "crypto";

const TOLERANCE_SECONDS = 300;

export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verifies a Stripe webhook signature (the "Stripe-Signature" header) against
 * the raw request body using Node's built-in crypto — no Stripe SDK dependency.
 * Implements Stripe's documented scheme: HMAC-SHA256("{timestamp}.{body}", secret)
 * compared in constant time, with a timestamp tolerance to reject replays.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): SignatureVerificationResult {
  if (!signatureHeader) {
    return { valid: false, error: "Missing Stripe-Signature header" };
  }

  if (!secret) {
    return { valid: false, error: "Webhook signing secret is not configured" };
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    return { valid: false, error: "Malformed Stripe-Signature header" };
  }

  const timestampSeconds = Number(timestamp);
  const age = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (!Number.isFinite(timestampSeconds) || age > TOLERANCE_SECONDS) {
    return { valid: false, error: "Webhook timestamp outside tolerance" };
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return { valid: false, error: "Signature mismatch" };
  }

  return { valid: true };
}
