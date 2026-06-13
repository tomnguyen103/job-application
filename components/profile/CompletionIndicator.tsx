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
}: Props): ReactElement | null {
  // A complete profile shows no card at all. The indicator only exists to
  // surface what is still missing, regardless of where it is rendered.
  if (missingFields.length === 0) {
    return null;
  }

  const dashOffset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;

  return (
    <section className="flex flex-col items-start justify-between gap-6 rounded-md border border-border bg-surface-elevated p-6 shadow-card sm:flex-row sm:items-center">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
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
          <h2 className="text-base font-semibold leading-6 text-text-primary">
            Profile needs attention
          </h2>
        </div>

        <p className="max-w-[520px] text-sm font-medium leading-5 text-text-secondary">
          Complete the missing fields to improve your chance of getting
          tailored matches and generating quality resumes.
        </p>

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
            className="text-error"
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
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-text-primary">
          {percentage}%
        </span>
      </div>
    </section>
  );
}
