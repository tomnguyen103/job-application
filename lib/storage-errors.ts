import { PROFILE_RESUME_BUCKET } from "@/lib/resume-storage";

export function isStorageNotFoundError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const record =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : {};
  const code = typeof record.code === "string" ? record.code : "";
  const status = typeof record.status === "number" ? record.status : null;
  const message =
    error instanceof Error
      ? error.message
      : typeof record.message === "string"
        ? record.message
        : String(error);

  return (
    status === 404 ||
    code === "404" ||
    code.toLowerCase() === "not_found" ||
    message.toLowerCase().includes("not found")
  );
}

type ResumeStorageClient = {
  storage: {
    from(bucket: typeof PROFILE_RESUME_BUCKET): {
      remove(path: string): Promise<{ error: unknown | null }>;
    };
  };
};

export async function removeExistingResumeFile(
  insforge: ResumeStorageClient,
  path: string,
  logPrefix: string,
): Promise<void> {
  try {
    const { error: removeError } = await insforge.storage
      .from(PROFILE_RESUME_BUCKET)
      .remove(path);
    if (removeError && !isStorageNotFoundError(removeError)) {
      console.error(`${logPrefix} remove error:`, removeError);
    }
  } catch (error) {
    console.error(`${logPrefix} remove threw:`, error);
  }
}
