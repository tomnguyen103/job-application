export const TAILORED_RESUME_BUCKET = "tailored-resumes";
export const TAILORED_RESUME_FILE_NAME = "tailored-resume.pdf";
export const TAILORED_RESUME_TTL_DAYS = 15;

export type TailoredResumeRecord = {
  id: string;
  user_id: string;
  job_id: string;
  storage_key: string;
  storage_url: string;
  file_name: string | null;
  generated_at: string;
  expires_at: string;
};

export type PreviousTailoredResumeCleanupRow = {
  id: string;
  storage_key: string | null;
};

export function buildTailoredResumeStorageKey(
  userId: string,
  jobId: string,
  resumeId: string,
): string {
  return `${userId}/${jobId}/${resumeId}.pdf`;
}

export function getTailoredResumeExpiresAt(
  generatedAt: Date,
  ttlDays = TAILORED_RESUME_TTL_DAYS,
): Date {
  return new Date(generatedAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);
}

export function safeTailoredResumeFileName(
  fileName: string | null | undefined,
): string {
  const trimmed = fileName?.trim();

  if (!trimmed) {
    return TAILORED_RESUME_FILE_NAME;
  }

  return trimmed.replace(/[^A-Za-z0-9._-]/g, "-");
}

export function previousTailoredResumeMetadataIdsToDelete(
  rows: PreviousTailoredResumeCleanupRow[],
  args: {
    currentResumeId: string;
    removedStorageKeys: Set<string>;
  },
): string[] {
  return rows
    .filter((row) => row.id !== args.currentResumeId)
    .filter((row) => !row.storage_key || args.removedStorageKeys.has(row.storage_key))
    .map((row) => row.id);
}
