import type { ReactElement } from "react";

type Props = {
  percentage: number;
  missingFields: string[];
};

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CompletionIndicator({
  percentage,
  missingFields,
}: Props): ReactElement {
  const dashOffset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;
  const isComplete = missingFields.length === 0;

  return (
    <section className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-surface p-6 shadow-card sm:flex-row sm:items-center">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <svg
              className="text-success"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg
              className="text-error"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          <h2 className="text-base font-semibold leading-6 text-text-primary">
            {isComplete ? "Profile complete" : "Profile needs attention"}
          </h2>
        </div>

        <p className="max-w-[520px] text-sm font-medium leading-5 text-text-secondary">
          {isComplete
            ? "Your profile is complete. You're ready to get tailored matches and generate quality resumes."
            : "Complete the missing fields to improve your chance of getting tailored matches and generating quality resumes."}
        </p>

        {missingFields.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {missingFields.map((field) => (
              <li
                key={field}
                className="rounded-full bg-accent-muted px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-accent"
              >
                {field}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative h-20 w-20 shrink-0">
        <svg
          className="h-20 w-20 -rotate-90"
          viewBox="0 0 80 80"
          aria-hidden="true"
        >
          <circle
            className="text-border-light"
            cx="40"
            cy="40"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
          />
          <circle
            className={isComplete ? "text-success" : "text-error"}
            cx="40"
            cy="40"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        {!isComplete && (
          <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-text-primary">
            {percentage}%
          </span>
        )}
      </div>
    </section>
  );
}
