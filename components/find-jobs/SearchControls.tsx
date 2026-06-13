"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { capturePostHogEvent } from "@/lib/posthog-client";

type Props = {
  userId: string;
};

type SearchOutcome = {
  found: number;
  saved: number;
  strongMatches: number;
};

function SearchIcon({ className }: { className: string }): ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="7.2"
        cy="7.2"
        r="4.6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m13.5 13.5-2.8-2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchControls({ userId }: Props): ReactElement {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (isSearching) {
      return;
    }

    const trimmedTitle = jobTitle.trim();
    const trimmedLocation = location.trim();

    if (!trimmedTitle) {
      setOutcome(null);
      setErrorMessage("Enter a job title to search.");
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setOutcome(null);

    capturePostHogEvent("job_search_started", {
      userId,
      jobTitle: trimmedTitle,
      location: trimmedLocation,
    });

    try {
      const response = await fetch("/api/agent/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: trimmedTitle,
          location: trimmedLocation,
        }),
      });

      let payload: {
        success?: boolean;
        data?: SearchOutcome;
        error?: string;
      } | null = null;

      try {
        // Boundary assertion on this app's own API response envelope.
        payload = (await response.json()) as {
          success?: boolean;
          data?: SearchOutcome;
          error?: string;
        };
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.success || !payload.data) {
        setErrorMessage(
          payload?.error ?? "Job search failed. Please try again.",
        );
        return;
      }

      setOutcome(payload.data);
      router.refresh();
    } catch (error) {
      console.error("[find-jobs/search]", error);
      setErrorMessage("Job search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="rounded-md border border-border bg-surface-elevated p-6 shadow-card">
      <div className="mb-5">
        <h2 className="text-base font-semibold leading-6 text-text-primary">
          Run a job search
        </h2>
        <p className="mt-1 text-xs font-medium leading-4 text-text-secondary">
          The agent saves strong matches to this workspace.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="job-title"
            className="text-[11px] font-medium uppercase tracking-wide text-text-secondary"
          >
            Job Title
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="job-title"
              name="jobTitle"
              type="text"
              placeholder="Frontend Engineer"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              disabled={isSearching}
              className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-accent focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="job-location"
            className="text-[11px] font-medium uppercase tracking-wide text-text-secondary"
          >
            Location
          </label>
          <input
            id="job-location"
            name="location"
            type="text"
            placeholder="Remote, New York..."
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            disabled={isSearching}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-accent focus:outline-none disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark disabled:opacity-50"
        >
          {isSearching ? (
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
              Searching...
            </>
          ) : (
            <>
              <SearchIcon className="text-accent-foreground" />
              Find Jobs
            </>
          )}
        </button>
      </form>

      {errorMessage ? (
        <p className="mt-4 text-xs font-medium text-error">{errorMessage}</p>
      ) : null}

      {outcome && !errorMessage ? (
        <p className="mt-4 flex items-center gap-2.5 rounded-md bg-success-lightest px-4 py-3 text-sm font-medium text-success-foreground">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              d="M8.7 1.8 9.9 5.1a1 1 0 0 0 .6.6l3.3 1.2a.55.55 0 0 1 0 1l-3.3 1.2a1 1 0 0 0-.6.6l-1.2 3.3a.55.55 0 0 1-1 0L6.5 9.7a1 1 0 0 0-.6-.6L2.6 7.9a.55.55 0 0 1 0-1l3.3-1.2a1 1 0 0 0 .6-.6l1.2-3.3a.55.55 0 0 1 1 0Z"
              fill="currentColor"
            />
            <path
              d="M13.1 11.2l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2Z"
              fill="currentColor"
            />
          </svg>
          {`Found ${outcome.found} jobs and saved ${outcome.strongMatches} strong matches.`}
        </p>
      ) : null}
    </div>
  );
}
