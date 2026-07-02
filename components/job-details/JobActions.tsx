import type { ReactElement } from "react";

type Props = {
  company: string;
  applyUrl: string | null;
};

export function JobActions({ company, applyUrl }: Props): ReactElement {
  if (!applyUrl) {
    return (
      <section className="rounded-md border border-border bg-surface-elevated p-6 shadow-card">
        <span className="inline-flex min-h-14 w-full items-center justify-center rounded-md bg-accent px-4 text-base font-semibold text-accent-foreground opacity-60 shadow-card">
          Apply link unavailable
        </span>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-border bg-surface-elevated p-6 shadow-card">
      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase leading-5 tracking-wide text-text-secondary">
          Ready to apply?
        </h2>
        <p className="mt-1 text-sm font-medium leading-5 text-text-secondary">
          Open the original posting when the match, research, and tailored
          resume are ready.
        </p>
      </div>
      <a
        href={applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-14 w-full items-center justify-center rounded-md bg-accent px-4 text-base font-semibold text-accent-foreground shadow-card transition-colors hover:bg-accent-dark"
      >
        Apply Now at {company}
      </a>
    </section>
  );
}
