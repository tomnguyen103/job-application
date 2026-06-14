import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTailoredResumeStorageKey,
  expiredTailoredResumeRecords,
  getTailoredResumeExpiresAt,
  latestUnexpiredTailoredResume,
  previousTailoredResumeMetadataIdsToDelete,
  safeTailoredResumeFileName,
  TAILORED_RESUME_BUCKET,
  TAILORED_RESUME_FILE_NAME,
  type TailoredResumeRecord,
} from "../lib/tailored-resume";

const NOW = new Date("2026-06-12T12:00:00.000Z");

function record(
  id: string,
  generatedAt: string,
  expiresAt: string,
): TailoredResumeRecord {
  return {
    id,
    user_id: "user-1",
    job_id: "job-1",
    storage_key: `user-1/job-1/${id}.pdf`,
    storage_url: `https://example.com/${id}.pdf`,
    file_name: TAILORED_RESUME_FILE_NAME,
    generated_at: generatedAt,
    expires_at: expiresAt,
  };
}

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

test("latestUnexpiredTailoredResume returns the newest unexpired row", () => {
  const rows = [
    record("old", "2026-06-11T12:00:00.000Z", "2026-06-26T12:00:00.000Z"),
    record("expired", "2026-05-01T12:00:00.000Z", "2026-06-01T12:00:00.000Z"),
    record("new", "2026-06-12T11:00:00.000Z", "2026-06-27T11:00:00.000Z"),
  ];

  assert.equal(latestUnexpiredTailoredResume(rows, NOW)?.id, "new");
});

test("expiredTailoredResumeRecords returns expired and invalid rows for cleanup", () => {
  const rows = [
    record("expired", "2026-05-01T12:00:00.000Z", "2026-06-01T12:00:00.000Z"),
    record("unexpired", "2026-06-12T11:00:00.000Z", "2026-06-27T11:00:00.000Z"),
    record("invalid", "2026-06-12T11:00:00.000Z", "not-a-date"),
  ];

  assert.deepEqual(
    expiredTailoredResumeRecords(rows, NOW).map((row) => row.id),
    ["expired", "invalid"],
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
