import Link from "next/link";
import type { ReactElement } from "react";

import type { DashboardStat } from "@/components/dashboard/StatsBar";

type Props = {
  profileComplete: boolean;
  stats: DashboardStat[];
};

function getStatValue(stats: DashboardStat[], label: string): string {
  return stats.find((stat) => stat.label === label)?.value ?? "-";
}

export function TodayWorkspace({
  profileComplete,
  stats,
}: Props): ReactElement {
  const totalJobs = getStatValue(stats, "Total Jobs Found");
  const averageMatch = getStatValue(stats, "Avg. Match Rate");
  const researchedCompanies = getStatValue(stats, "Companies Researched");
  const jobsThisWeek = getStatValue(stats, "Jobs This Week");

  return (
    <section className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="landing-hero-gradient grid gap-8 px-6 py-7 lg:grid-cols-[1fr_380px] lg:items-center lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
            Today
          </p>
          <h1 className="mt-4 text-[32px] font-bold leading-[1.08] text-text-black sm:text-[42px]">
            Your job search workspace
          </h1>
          <p className="mt-4 max-w-[660px] text-sm font-medium leading-6 text-text-secondary">
            Review the newest matches, keep research moving, and turn the best
            roles into tailored applications.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={profileComplete ? "/find-jobs" : "/profile"}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark"
            >
              {profileComplete ? "Find jobs" : "Complete profile"}
            </Link>
            <Link
              href="/find-jobs"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary"
            >
              Review saved jobs
            </Link>
          </div>
        </div>

        <div className="grid gap-3 rounded-md border border-border bg-surface-glass p-4">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
            <span className="text-sm font-medium leading-5 text-text-secondary">
              Jobs this week
            </span>
            <span className="text-xl font-semibold leading-7 text-text-primary">
              {jobsThisWeek}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
            <span className="text-sm font-medium leading-5 text-text-secondary">
              Average match
            </span>
            <span className="text-xl font-semibold leading-7 text-text-primary">
              {averageMatch}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm font-medium leading-5 text-text-secondary">
            <div className="rounded-md bg-surface px-3 py-3">
              <span className="block text-lg font-semibold leading-6 text-text-primary">
                {totalJobs}
              </span>
              jobs found
            </div>
            <div className="rounded-md bg-surface px-3 py-3">
              <span className="block text-lg font-semibold leading-6 text-text-primary">
                {researchedCompanies}
              </span>
              researched
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
