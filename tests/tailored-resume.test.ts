import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTailoredResumeStorageKey,
  getTailoredResumeExpiresAt,
  previousTailoredResumeMetadataIdsToDelete,
  safeTailoredResumeFileName,
  TAILORED_RESUME_BUCKET,
  TAILORED_RESUME_FILE_NAME,
} from "../lib/tailored-resume";

const NOW = new Date("2026-06-12T12:00:00.000Z");

test("buildTailoredResumeStorageKey stays inside the tailored private bucket path", () => {
  assert.equal(TAILORED_RESUME_BUCKET, "tailored-resumes");
  assert.equal(
    buildTailoredResumeStorageKey("user-1", "job-2", "resume-3"),
    "user-1/job-2/resume-3.pdf",
  );
});

test("getTailoredResumeExpiresAt applies the 15 day TTL", () => {
  assert.equal(
    getTailoredResumeExpiresAt(NOW).toISOString(),
    "2026-06-27T12:00:00.000Z",
  );
});

test("safeTailoredResumeFileName keeps download filenames header-safe", () => {
  assert.equal(safeTailoredResumeFileName(null), TAILORED_RESUME_FILE_NAME);
  assert.equal(
    safeTailoredResumeFileName('tailored resume "final".pdf'),
    "tailored-resume--final-.pdf",
  );
});

test("previousTailoredResumeMetadataIdsToDelete keeps metadata when file deletion failed", () => {
  const rows = [
    { id: "old-removed", storage_key: "user-1/job-1/old-removed.pdf" },
    { id: "old-failed", storage_key: "user-1/job-1/old-failed.pdf" },
    { id: "old-metadata-only", storage_key: null },
    { id: "current", storage_key: "user-1/job-1/current.pdf" },
  ];

  assert.deepEqual(
    previousTailoredResumeMetadataIdsToDelete(rows, {
      currentResumeId: "current",
      removedStorageKeys: new Set(["user-1/job-1/old-removed.pdf"]),
    }),
    ["old-removed", "old-metadata-only"],
  );
});
