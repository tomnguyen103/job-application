import { createHash, randomUUID } from "node:crypto";

const RELEASE_TOKEN_HASH_ALGORITHM = "sha256";

export function baseResumeGenerationUsageKey(
  idempotencyKey?: string | null,
): string {
  const normalizedKey = idempotencyKey?.trim();
  if (normalizedKey) {
    return `generate:${createHash("sha256").update(normalizedKey).digest("hex")}`;
  }

  return `generate:${randomUUID()}`;
}

export function usageReservationReleaseToken(): string {
  return randomUUID();
}

export function usageReservationReleaseTokenHash(token: string): string {
  return createHash(RELEASE_TOKEN_HASH_ALGORITHM).update(token).digest("hex");
}

export function baseResumeGenerationReleaseToken(): string {
  return usageReservationReleaseToken();
}

export function baseResumeGenerationReleaseTokenHash(token: string): string {
  return usageReservationReleaseTokenHash(token);
}
