import assert from "node:assert/strict";
import test from "node:test";

import { baseResumeGenerationUsageKey } from "@/lib/resume-generation-quota";

test("base resume generation usage keys are unique per request", () => {
  const firstKey = baseResumeGenerationUsageKey();
  const secondKey = baseResumeGenerationUsageKey();

  assert.match(firstKey, /^generate:[0-9a-f-]{36}$/);
  assert.match(secondKey, /^generate:[0-9a-f-]{36}$/);
  assert.notEqual(firstKey, secondKey);
});

test("base resume generation usage keys are stable for a provided idempotency key", () => {
  const firstKey = baseResumeGenerationUsageKey(" request-123 ");
  const secondKey = baseResumeGenerationUsageKey("request-123");
  const differentKey = baseResumeGenerationUsageKey("request-456");

  assert.match(firstKey, /^generate:[0-9a-f]{64}$/);
  assert.equal(firstKey, secondKey);
  assert.notEqual(firstKey, differentKey);
});
