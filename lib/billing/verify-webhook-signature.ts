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

  // Stripe can send multiple v1=... candidates during secret rotation (one
  // signed with the old secret, one with the new) — collect all of them and
  // accept if any matches, rather than only checking whichever comes last.
  let timestamp: string | undefined;
  const signatureCandidates: string[] = [];

  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=");
    if (key === "t" && value) {
      timestamp = value;
    } else if (key === "v1" && value) {
      signatureCandidates.push(value);
    }
  }

  if (!timestamp || signatureCandidates.length === 0) {
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

  const matchesAnyCandidate = signatureCandidates.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate, "utf8");
    return (
      expectedBuffer.length === candidateBuffer.length &&
      timingSafeEqual(expectedBuffer, candidateBuffer)
    );
  });

  if (!matchesAnyCandidate) {
    return { valid: false, error: "Signature mismatch" };
  }

  return { valid: true };
}
