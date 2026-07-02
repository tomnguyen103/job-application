import { createHash, randomUUID } from "node:crypto";

export function baseResumeGenerationUsageKey(
  idempotencyKey?: string | null,
): string {
  const normalizedKey = idempotencyKey?.trim();
  if (normalizedKey) {
    return `generate:${createHash("sha256").update(normalizedKey).digest("hex")}`;
  }

  return `generate:${randomUUID()}`;
}
