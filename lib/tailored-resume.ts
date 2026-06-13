export const TAILORED_RESUME_BUCKET = "tailored-resumes";
export const TAILORED_RESUME_FILE_NAME = "tailored-resume.pdf";
export const TAILORED_RESUME_TTL_DAYS = 15;

export type TailoredResumeRecord = {
  id: string;
  user_id: string;
  job_id: string;
  storage_key: string;
  file_name: string | null;
  generated_at: string;
  expires_at: string;
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

export function isUnexpiredTailoredResume(
  record: Pick<TailoredResumeRecord, "expires_at">,
  now: Date,
): boolean {
  const expiresAt = Date.parse(record.expires_at);

  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

export function latestUnexpiredTailoredResume<T extends TailoredResumeRecord>(
  records: T[],
  now: Date,
): T | null {
  return records
    .filter((record) => isUnexpiredTailoredResume(record, now))
    .sort(
      (a, b) =>
        Date.parse(b.generated_at) - Date.parse(a.generated_at),
    )[0] ?? null;
}

export function expiredTailoredResumeRecords<T extends TailoredResumeRecord>(
  records: T[],
  now: Date,
): T[] {
  return records.filter((record) => !isUnexpiredTailoredResume(record, now));
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
