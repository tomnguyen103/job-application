import Link from "next/link";
import type { ReactElement } from "react";

import type { SkillGapInsight } from "@/lib/engagement-insights";

type Props = {
  insights: SkillGapInsight[];
  loadFailed?: boolean;
};

function EmptyState(): ReactElement {
  return (
    <div className="rounded-md border border-border bg-surface px-5 py-8 text-center">
      <p className="text-sm font-semibold leading-5 text-text-primary">
        No repeated gaps yet
      </p>
      <p className="mt-2 text-sm font-medium leading-6 text-text-secondary">
        Search and save more roles to see which missing skills are worth
        preparing first.
      </p>
      <Link
        href="/find-jobs"
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark"
      >
        Find more jobs
      </Link>
    </div>
  );
}

export function SkillGapInsights({
  insights,
  loadFailed = false,
}: Props): ReactElement {
  return (
    <section className="rounded-md border border-border bg-surface-elevated p-6 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
            Skill gap insights
          </p>
          <h2 className="mt-3 text-xl font-bold leading-7 text-text-primary">
            Prepare the gaps that repeat
          </h2>
          <p className="mt-2 max-w-[640px] text-sm font-medium leading-6 text-text-secondary">
            These are pulled from saved job matches, so they reflect patterns in
            the roles you are already considering.
          </p>
        </div>
        <Link
          href="/find-jobs?match=high"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary"
        >
          Review high matches
        </Link>
      </div>

      {loadFailed ? (
        <p className="mt-6 rounded-md border border-border bg-surface px-5 py-8 text-center text-sm font-medium leading-5 text-text-secondary">
          Could not load skill gap insights. Refresh the page to try again.
        </p>
      ) : insights.length === 0 ? (
        <div className="mt-6">
          <EmptyState />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 lg:grid-cols-5">
          {insights.map((insight) => (
            <article
              key={insight.skill}
              className="rounded-md border border-border bg-surface px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold leading-5 text-text-primary">
                  {insight.skill}
                </h3>
                <span className="rounded-full bg-accent-muted px-2.5 py-1 text-xs font-semibold leading-4 text-accent">
                  {insight.count}
                </span>
              </div>
              <p className="mt-3 text-xs font-medium leading-5 text-text-secondary">
                Seen in {insight.companies.join(", ")}
              </p>
              <p className="mt-3 text-xs font-medium leading-5 text-text-muted">
                {insight.roles.join(", ")}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
