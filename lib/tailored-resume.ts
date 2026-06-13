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

/**
 * Constructs the storage key for a tailored resume.
 *
 * @param userId - The user's identifier used as the first path segment
 * @param jobId - The job's identifier used as the second path segment
 * @param resumeId - The resume's identifier used as the file name (without extension)
 * @returns The storage object key in the form `{userId}/{jobId}/{resumeId}.pdf`
 */
export function buildTailoredResumeStorageKey(
  userId: string,
  jobId: string,
  resumeId: string,
): string {
  return `${userId}/${jobId}/${resumeId}.pdf`;
}

/**
 * Compute the expiration Date for a tailored resume.
 *
 * @param generatedAt - The generation timestamp used as the base for the expiration
 * @param ttlDays - Number of days until expiration; defaults to `TAILORED_RESUME_TTL_DAYS`
 * @returns The Date obtained by adding `ttlDays` days to `generatedAt`
 */
export function getTailoredResumeExpiresAt(
  generatedAt: Date,
  ttlDays = TAILORED_RESUME_TTL_DAYS,
): Date {
  return new Date(generatedAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);
}

/**
 * Determines whether a tailored resume record is still valid based on its `expires_at` timestamp.
 *
 * @param record - Object containing the `expires_at` timestamp string for the record
 * @param now - Reference time used to evaluate expiration
 * @returns `true` if `record.expires_at` is a valid timestamp representing a time later than `now`, `false` otherwise
 */
export function isUnexpiredTailoredResume(
  record: Pick<TailoredResumeRecord, "expires_at">,
  now: Date,
): boolean {
  const expiresAt = Date.parse(record.expires_at);

  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

/**
 * Selects the most recently generated unexpired tailored resume from a list.
 *
 * @param records - Array of tailored resume records to consider.
 * @param now - Reference time used to evaluate each record's expiration.
 * @returns The record with the latest `generated_at` that is not expired according to `now`, or `null` if none exist.
 */
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

/**
 * Filters the provided tailored resume records and returns those that are expired at the given reference time.
 *
 * @param records - Array of tailored resume records to evaluate
 * @param now - Reference time used to determine whether a record's `expires_at` is in the future
 * @returns An array of records whose `expires_at` is not a finite timestamp greater than `now`
 */
export function expiredTailoredResumeRecords<T extends TailoredResumeRecord>(
  records: T[],
  now: Date,
): T[] {
  return records.filter((record) => !isUnexpiredTailoredResume(record, now));
}

/**
 * Normalize a proposed resume file name and fall back to a default when absent.
 *
 * @param fileName - The candidate file name (may be null, undefined, or whitespace)
 * @returns The trimmed file name with any character not matching `A-Za-z0-9._-` replaced by `-`, or `tailored-resume.pdf` when the input is empty or falsy
 */
export function safeTailoredResumeFileName(
  fileName: string | null | undefined,
): string {
  const trimmed = fileName?.trim();

  if (!trimmed) {
    return TAILORED_RESUME_FILE_NAME;
  }

  return trimmed.replace(/[^A-Za-z0-9._-]/g, "-");
}
