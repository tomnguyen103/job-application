import {
  safeTailoredResumeFileName,
  TAILORED_RESUME_BUCKET,
} from "@/lib/tailored-resume";

type DownloadUser = {
  id: string;
};

type QueryResult<T> = Promise<{ data: T | null; error: unknown | null }>;

type JobQuery = {
  select(columns: string): JobQuery;
  eq(column: string, value: string): JobQuery;
  maybeSingle(): QueryResult<{ id: string }>;
};

type TailoredResumeDownloadRow = {
  id: string;
  storage_key: string;
  file_name: string | null;
  generated_at: string;
  expires_at: string;
};

type ResumeQuery = {
  select(columns: string): ResumeQuery;
  eq(column: string, value: string): ResumeQuery;
  gt(column: string, value: string): ResumeQuery;
  order(column: string, options: { ascending: boolean }): ResumeQuery;
  limit(count: number): ResumeQuery;
  maybeSingle(): QueryResult<TailoredResumeDownloadRow>;
};

type TailoredResumeDownloadDatabase = {
  from(table: "jobs"): JobQuery;
  from(table: "tailored_resumes"): ResumeQuery;
};

type TailoredResumeDownloadStorage = {
  from(bucket: typeof TAILORED_RESUME_BUCKET): {
    download(key: string): Promise<{ data: Blob | null; error: unknown | null }>;
  };
};

export type TailoredResumeDownloadClient = {
  database: TailoredResumeDownloadDatabase;
  storage: TailoredResumeDownloadStorage;
};

export type TailoredResumeDownloadResult =
  | {
      status: 200;
      blob: Blob;
      fileName: string;
    }
  | {
      status: 401 | 404 | 500;
      body: { success: false; error: string };
    };

export async function resolveTailoredResumeDownload({
  user,
  jobId,
  insforge,
  now = new Date(),
}: {
  user: DownloadUser | null;
  jobId: string;
  insforge: TailoredResumeDownloadClient;
  now?: Date;
}): Promise<TailoredResumeDownloadResult> {
  if (!user) {
    return {
      status: 401,
      body: { success: false, error: "Unauthorized" },
    };
  }

  if (!jobId) {
    return {
      status: 404,
      body: { success: false, error: "Job not found." },
    };
  }

  const { data: jobRow, error: jobError } = await insforge.database
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (jobError) {
    console.error("[tailored-resume/download] job read error:", jobError);
    return {
      status: 500,
      body: { success: false, error: "Failed to load this job. Please try again." },
    };
  }

  if (!jobRow) {
    return {
      status: 404,
      body: { success: false, error: "Job not found." },
    };
  }

  const { data: resumeRow, error: resumeError } = await insforge.database
    .from("tailored_resumes")
    .select("id, storage_key, file_name, generated_at, expires_at")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .gt("expires_at", now.toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (resumeError) {
    console.error(
      "[tailored-resume/download] metadata read error:",
      resumeError,
    );
    return {
      status: 500,
      body: {
        success: false,
        error: "Failed to load the tailored resume. Please try again.",
      },
    };
  }

  if (!resumeRow) {
    return {
      status: 404,
      body: {
        success: false,
        error: "No unexpired tailored resume found.",
      },
    };
  }

  const { data: blob, error: downloadError } = await insforge.storage
    .from(TAILORED_RESUME_BUCKET)
    .download(resumeRow.storage_key);

  if (downloadError) {
    console.error(
      "[tailored-resume/download] storage download error:",
      downloadError,
    );
    return {
      status: 500,
      body: {
        success: false,
        error: "Failed to download the tailored resume. Please try again.",
      },
    };
  }

  if (!blob) {
    console.error("[tailored-resume/download] missing storage blob");
    return {
      status: 404,
      body: {
        success: false,
        error: "No unexpired tailored resume found.",
      },
    };
  }

  return {
    status: 200,
    blob,
    fileName: safeTailoredResumeFileName(resumeRow.file_name),
  };
}
