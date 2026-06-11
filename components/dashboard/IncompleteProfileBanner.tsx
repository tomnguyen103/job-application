import Link from "next/link";
import type { ReactElement } from "react";

export function IncompleteProfileBanner(): ReactElement {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent">
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </span>
        <div>
          <h2 className="text-base font-semibold leading-6 text-text-primary">
            Complete your profile to start finding jobs
          </h2>
          <p className="mt-1 text-sm font-medium leading-5 text-text-secondary">
            The agent needs your skills, experience, and preferences before it
            can match you with the right roles.
          </p>
        </div>
      </div>
      <Link
        href="/profile"
        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground shadow-card transition-opacity hover:opacity-90"
      >
        Complete Profile
      </Link>
    </section>
  );
}
