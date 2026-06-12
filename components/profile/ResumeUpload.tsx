"use client";

import { useActionState, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactElement } from "react";
import { useRouter } from "next/navigation";

import { ResumePreview } from "@/components/profile/ResumePreview";
import { saveResume } from "@/actions/profile";
import type { Profile } from "@/types";

type Props = {
  resumeUrl?: string;
  onExtract?: (data: Partial<Profile>) => void;
};

type ResumeState = {
  success: boolean;
  error?: string;
  fileName?: string;
};

const initialState: ResumeState = { success: false };

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}


export function ResumeUpload({ resumeUrl, onExtract }: Props): ReactElement {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState(
    saveResume,
    initialState,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [uploadSizeLabel, setUploadSizeLabel] = useState<string | null>(null);

  const hasResume = state.success || !!resumeUrl;
  // A successful generation replaces the stored file with resume.pdf, so the
  // row must stop showing the previously uploaded file's name.
  const displayFileName = generateSuccess
    ? "resume.pdf"
    : (state.fileName ?? (resumeUrl ? "resume.pdf" : null));
  const metaLabel = generateSuccess
    ? "Generated from your profile"
    : state.fileName && uploadSizeLabel
      ? uploadSizeLabel
      : "PDF document";

  const validateAndSubmit = (file: File): void => {
    setClientError(null);
    setGenerateSuccess(false);
    setExtractSuccess(false);
    if (file.type !== "application/pdf") {
      setClientError("Only PDF files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setClientError("File must be 5 MB or smaller.");
      return;
    }
    setUploadSizeLabel(formatFileSize(file.size));
    formRef.current?.requestSubmit();
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) validateAndSubmit(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      if (inputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        inputRef.current.files = dt.files;
      }
      validateAndSubmit(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (): void => {
    setIsDragging(false);
  };

  const handleReplace = (): void => {
    inputRef.current?.click();
  };

  const handleExtract = async (): Promise<void> => {
    setExtractError(null);
    setExtractSuccess(false);
    setIsExtracting(true);
    try {
      const res = await fetch("/api/resume/extract", { method: "POST" });
      const json = (await res.json()) as { data?: Partial<Profile>; error?: string };
      if (!res.ok) {
        setExtractError(json.error ?? "Extraction failed. Please try again.");
        return;
      }
      const data = json.data ?? {};
      if (Object.keys(data).length === 0) {
        setExtractError(
          "No profile data could be read from this resume. Please try a different PDF.",
        );
        return;
      }
      onExtract?.(data);
      setExtractSuccess(true);
    } catch {
      setExtractError("Extraction failed. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async (): Promise<void> => {
    setGenerateError(null);
    setGenerateSuccess(false);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/resume/generate", { method: "POST" });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        setGenerateError(json.error ?? "Generation failed. Please try again.");
        return;
      }
      setGenerateSuccess(true);
      router.refresh();
    } catch {
      setGenerateError("Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const errorMessage = clientError ?? (!state.success && state.error ? state.error : null);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold leading-6 text-text-primary">
          Resume
        </h2>
        <p className="text-sm font-medium leading-5 text-text-secondary">
          Upload an existing resume to auto-fill the profile, or generate a new
          one from your details below.
        </p>
      </div>

      <form ref={formRef} action={formAction}>
        <input
          ref={inputRef}
          name="resume"
          type="file"
          accept="application/pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        {hasResume && displayFileName ? (
          <div className="flex flex-col gap-2">
            <ResumePreview
              fileName={displayFileName}
              meta={metaLabel}
              href="/api/resume/download"
              onRemove={handleReplace}
              label="Replace"
            />
            {isPending && (
              <p className="text-xs font-medium text-text-muted">Uploading…</p>
            )}
            {errorMessage && (
              <p className="text-xs font-medium text-error">{errorMessage}</p>
            )}
            <div className="flex flex-col gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleExtract}
                disabled={isExtracting || isPending}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-accent bg-accent-muted px-4 text-sm font-medium text-accent transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {isExtracting ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Extracting profile data…
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    Extract from Resume
                  </>
                )}
              </button>
              {extractError && (
                <p className="text-xs font-medium text-error">{extractError}</p>
              )}
              {extractSuccess && !extractError && (
                <p className="text-xs font-medium text-success">
                  Resume data applied to the form below — review it, then Save
                  Profile.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              isDragging ? "border-accent bg-accent-muted" : "border-border"
            }`}
          >
            <svg
              className="text-accent"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2" />
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
            </svg>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium leading-5 text-text-primary">
                {isPending ? "Uploading…" : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs font-normal leading-4 text-text-muted">
                PDF format only. Maximum file size 5MB.
              </p>
            </div>
            {!isPending && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary shadow-card transition-colors hover:bg-surface-secondary"
              >
                Select Resume
              </button>
            )}
            {errorMessage && (
              <p className="text-xs font-medium text-error">{errorMessage}</p>
            )}
          </div>
        )}
      </form>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm font-medium leading-5 text-text-secondary">
            Need a fresh document based on the fields below?
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || isPending || isExtracting}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground shadow-card transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <svg
                  className="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Generating resume…
              </>
            ) : (
              "Generate Resume from Profile"
            )}
          </button>
        </div>
        {generateError && (
          <p className="text-xs font-medium text-error">{generateError}</p>
        )}
        {generateSuccess && !generateError && (
          <p className="text-xs font-medium text-success">
            Resume generated — click the file above to view it.
          </p>
        )}
      </div>
    </section>
  );
}
