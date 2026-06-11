import type { ReactElement } from "react";

type Props = {
  company: string;
  applyUrl: string | null;
};

export function JobActions({ company, applyUrl }: Props): ReactElement {
  if (!applyUrl) {
    return (
      <span className="inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-semibold text-accent-foreground opacity-60 shadow-card">
        Apply link unavailable
      </span>
    );
  }

  return (
    <a
      href={applyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-semibold text-accent-foreground shadow-card transition-opacity hover:opacity-90"
    >
      Apply Now at {company}
    </a>
  );
}
