"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactElement } from "react";

export type TailoredResumeInitialState = {
  status: "idle" | "ready" | "expired";
  downloadUrl: string | null;
  expiresAt: string | null;
};

type Props = {
  jobId: string;
  initialState: TailoredResumeInitialState;
};

type TailoredResumeStatus =
  | "idle"
  | "generating"
  | "ready"
  | "expired"
  | "error";

type TailoredResumeResult = {
  downloadUrl: string;
  expiresAt: string;
};

function DocumentIcon(): ReactElement {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 2.8h5.1L13 5.7v9.5H5a1.5 1.5 0 0 1-1.5-1.5V4.3A1.5 1.5 0 0 1 5 2.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 3v3h3M6.5 9h5M6.5 11.5h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GenerateIcon(): ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 2.2 9.1 5l2.9 1.1L9.1 7.2 8 10 6.9 7.2 4 6.1 6.9 5 8 2.2ZM12.3 9.2l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2ZM3.3 10.2l.4 1 .9.4-.9.4-.4 1-.4-1-.9-.4.9-.4.4-1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon(): ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 2.5v7M5.2 7.2 8 10l2.8-2.8M3 13.5h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerIcon(): ReactElement {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function valueFor(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return Reflect.get(value, key);
}

function errorFromPayload(payload: unknown): string {
  const error = valueFor(payload, "error");
  return typeof error === "string" && error.trim()
    ? error.trim()
    : "Could not generate a tailored resume. Please try again.";
}

function resultFromPayload(payload: unknown): TailoredResumeResult | null {
  const data = valueFor(payload, "data");
  const downloadUrl = valueFor(data, "downloadUrl");
  const expiresAt = valueFor(data, "expiresAt");

  if (typeof downloadUrl !== "string" || typeof expiresAt !== "string") {
    return null;
  }

  return { downloadUrl, expiresAt };
}

function formatDate(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TailoredResumeAction({
  jobId,
  initialState,
}: Props): ReactElement {
  const router = useRouter();
  const [status, setStatus] =
    useState<TailoredResumeStatus>(initialState.status);
  const [resume, setResume] = useState<TailoredResumeResult | null>(
    initialState.status === "ready" && initialState.downloadUrl && initialState.expiresAt
      ? {
          downloadUrl: initialState.downloadUrl,
          expiresAt: initialState.expiresAt,
        }
      : null,
  );
  const [error, setError] = useState("");

  async function handleGenerate(): Promise<void> {
    setError("");
    setStatus("generating");

    try {
      const response = await fetch(`/api/jobs/${jobId}/tailored-resume`, {
        method: "POST",
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus("error");
        setError(errorFromPayload(payload));
        return;
      }

      const result = resultFromPayload(payload);
      if (!result) {
        setStatus("error");
        setError("Tailored resume returned no downloadable file.");
        return;
      }

      setResume(result);
      setStatus("ready");
      router.refresh();
    } catch (requestError) {
      console.error("[TailoredResumeAction]", requestError);
      setStatus("error");
      setError("Could not generate a tailored resume. Please try again.");
    }
  }

  const expiresText = formatDate(resume?.expiresAt ?? initialState.expiresAt);
  const isGenerating = status === "generating";
  const ready = status === "ready" && resume;

  return (
    <section className="overflow-hidden rounded-md border border-border bg-surface-elevated shadow-card">
      <div className="flex flex-col gap-4 border-b border-border px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted text-accent">
            <DocumentIcon />
          </span>
          <h2 className="text-xl font-bold leading-7 text-text-primary">
            Tailored Resume
          </h2>
        </div>

        {ready ? (
          <a
            href={resume.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border bg-surface px-5 text-base font-semibold text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary"
          >
            <DownloadIcon />
            Download Tailored Resume
          </a>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            aria-busy={isGenerating}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-accent px-5 text-base font-semibold text-accent-foreground shadow-card transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? <SpinnerIcon /> : <GenerateIcon />}
            {isGenerating ? "Generating..." : "Generate Tailored Resume"}
          </button>
        )}
      </div>

      <div className="px-8 py-5">
        {status === "ready" ? (
          <p className="text-sm font-semibold leading-5 text-success">
            Ready to download{expiresText ? `. Expires ${expiresText}.` : "."}
          </p>
        ) : status === "expired" ? (
          <p className="text-sm font-medium leading-5 text-text-muted">
            Previous tailored resume expired. Generate a fresh version.
          </p>
        ) : status === "generating" ? (
          <p className="text-sm font-medium leading-5 text-text-muted">
            Generating a job-specific PDF now.
          </p>
        ) : (
          <p className="text-sm font-medium leading-5 text-text-muted">
            Create a temporary resume for this saved job.
          </p>
        )}
      </div>

      {status === "error" && error ? (
        <p
          className="border-t border-border px-8 py-4 text-sm font-medium leading-5 text-error"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
