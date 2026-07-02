import { randomUUID } from "node:crypto";

export function baseResumeGenerationUsageKey(): string {
  return `generate:${randomUUID()}`;
}
