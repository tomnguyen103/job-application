import assert from "node:assert/strict";
import test from "node:test";

import { PROFILE_RESUME_BUCKET } from "@/lib/resume-storage";
import { removeExistingResumeFile } from "@/lib/storage-errors";

test("removeExistingResumeFile logs thrown cleanup errors without rethrowing", async () => {
  const logs: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    logs.push(args);
  };

  try {
    await removeExistingResumeFile(
      {
        storage: {
          from(bucket) {
            assert.equal(bucket, PROFILE_RESUME_BUCKET);
            return {
              async remove() {
                throw new Error("storage offline");
              },
            };
          },
        },
      },
      "user-1/resume.pdf",
      "[test] cleanup",
    );
  } finally {
    console.error = originalError;
  }

  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.[0], "[test] cleanup remove threw:");
});
