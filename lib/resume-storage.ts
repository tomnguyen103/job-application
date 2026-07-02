import { randomUUID } from "node:crypto";

export const PROFILE_RESUME_BUCKET = "resumes";

const LEGACY_RESUME_FILE_NAME = "resume.pdf";

type ResumeReferencePayload = {
  id: string;
  resume_pdf_url: string;
  resume_pdf_key: string;
  updated_at: string;
};

type ResumeReferenceRow = {
  id: string;
};

type ResumeReferenceMutationResponse = PromiseLike<{
  data: ResumeReferenceRow | null;
  error: unknown | null;
}>;

type ResumeReferenceUpdateQuery = {
  eq(column: string, value: unknown): ResumeReferenceUpdateQuery;
  is(column: string, value: null): ResumeReferenceUpdateQuery;
  select(columns: string): {
    maybeSingle(): ResumeReferenceMutationResponse;
  };
};

type ResumeReferenceInsertQuery = {
  select(columns: string): {
    single(): ResumeReferenceMutationResponse;
  };
};

type ResumeReferenceProfileTable = {
  insert(rows: ResumeReferencePayload[]): ResumeReferenceInsertQuery;
  update(row: ResumeReferencePayload): ResumeReferenceUpdateQuery;
};

type ResumeReferenceDatabaseClient = {
  database: {
    from(table: "profiles"): ResumeReferenceProfileTable;
  };
};

export type ReplaceResumeReferenceResult =
  | { status: "saved" }
  | { status: "stale" }
  | { status: "error"; error: unknown };

export function defaultResumeStorageKey(userId: string): string {
  return `${userId}/${LEGACY_RESUME_FILE_NAME}`;
}

export function buildResumeStorageKey(userId: string): string {
  return `${userId}/resume-${randomUUID()}.pdf`;
}

export function resolveResumeStorageKey(
  userId: string,
  savedKey: string | null | undefined,
): string {
  const trimmedKey = savedKey?.trim();
  if (trimmedKey?.startsWith(`${userId}/`)) {
    return trimmedKey;
  }

  return defaultResumeStorageKey(userId);
}

export async function replaceResumeReferenceIfCurrent(
  client: ResumeReferenceDatabaseClient,
  args: {
    userId: string;
    profileExists: boolean;
    currentResumePdfKey: string | null | undefined;
    nextResumePdfKey: string;
    nextResumePdfUrl: string;
  },
): Promise<ReplaceResumeReferenceResult> {
  const payload = {
    id: args.userId,
    resume_pdf_url: args.nextResumePdfUrl,
    resume_pdf_key: args.nextResumePdfKey,
    updated_at: new Date().toISOString(),
  };

  if (!args.profileExists) {
    const { error } = await client.database
      .from("profiles")
      .insert([payload])
      .select("id")
      .single();

    return error ? { status: "error", error } : { status: "saved" };
  }

  const expectedKey =
    typeof args.currentResumePdfKey === "string" &&
    args.currentResumePdfKey.length > 0
      ? args.currentResumePdfKey
      : null;
  let updateQuery = client.database
    .from("profiles")
    .update(payload)
    .eq("id", args.userId);

  updateQuery = expectedKey
    ? updateQuery.eq("resume_pdf_key", expectedKey)
    : updateQuery.is("resume_pdf_key", null);

  const { data, error } = await updateQuery.select("id").maybeSingle();
  if (error) {
    return { status: "error", error };
  }

  return data ? { status: "saved" } : { status: "stale" };
}
