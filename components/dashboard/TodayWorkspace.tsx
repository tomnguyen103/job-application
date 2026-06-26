import Link from "next/link";
import type { ReactElement } from "react";

import { PlanSummary } from "@/components/billing/PlanSummary";
import { UsageMeter } from "@/components/billing/UsageMeter";
import type { UserEntitlement, BillingEventType } from "@/lib/billing/plans";
import {
  DASHBOARD_STAT_LABELS,
  type DashboardStat,
  type DashboardStatLabel,
} from "@/components/dashboard/StatsBar";
import type { TodayAction, TodayActionTone } from "@/lib/engagement-insights";

type Props = {
  profileComplete: boolean;
  profileLoadFailed?: boolean;
  stats: DashboardStat[];
  actions: TodayAction[];
  actionsLoadFailed?: boolean;
  entitlement: UserEntitlement;
  usage: Record<BillingEventType, number>;
};

function getStatValue(stats: DashboardStat[], label: DashboardStatLabel): string {
  return stats.find((stat) => stat.label === label)?.value ?? "-";
}

function actionToneClass(tone: TodayActionTone): string {
  if (tone === "info") {
    return "bg-info-lightest text-info-foreground";
  }

  if (tone === "success") {
    return "bg-success-lightest text-success-foreground";
  }

  return "bg-accent-muted text-accent";
}

export function TodayWorkspace({
  profileComplete,
  profileLoadFailed = false,
  stats,
  actions,
  actionsLoadFailed = false,
  entitlement,
  usage,
}: Props): ReactElement {
  const totalJobs = getStatValue(stats, DASHBOARD_STAT_LABELS.TOTAL_JOBS);
  const averageMatch = getStatValue(stats, DASHBOARD_STAT_LABELS.AVG_MATCH);
  const jobsThisWeek = getStatValue(stats, DASHBOARD_STAT_LABELS.JOBS_WEEK);
  const primaryActionHref =
    profileComplete || profileLoadFailed ? "/find-jobs" : "/profile";
  const primaryActionLabel = profileComplete
    ? "Find jobs"
    : profileLoadFailed
      ? "Find jobs"
      : "Complete profile";

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
              href={primaryActionHref}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark"
            >
              {primaryActionLabel}
            </Link>
            <Link
              href="/find-jobs"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary"
            >
              Review saved jobs
            </Link>
          </div>

          {entitlement && usage && (
            <div className="mt-8 border-t border-border/60 pt-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Billing & Quotas
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <PlanSummary entitlement={entitlement} />
                <UsageMeter usage={usage} planKey={entitlement.planKey} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-surface-glass p-4">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
            <div>
              <p className="text-sm font-semibold leading-5 text-text-primary">
                Next moves
              </p>
              <p className="mt-1 text-xs font-medium leading-4 text-text-secondary">
                Based on your saved jobs and resume state.
              </p>
            </div>
            <span className="rounded-full bg-accent-muted px-3 py-1 text-xs font-semibold leading-4 text-accent">
              {jobsThisWeek} this week
            </span>
          </div>

          {actionsLoadFailed ? (
            <p className="py-8 text-sm font-medium leading-5 text-text-secondary">
              Could not load suggested actions. The rest of your dashboard is
              still available.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {actions.map((action) => (
                <li key={action.id}>
                  <Link
                    href={action.href}
                    className="block rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:border-accent hover:bg-surface-secondary"
                  >
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold leading-4 ${actionToneClass(action.tone)}`}
                    >
                      {action.label}
                    </span>
                    <span className="mt-3 block text-sm font-semibold leading-5 text-text-primary">
                      {action.title}
                    </span>
                    <span className="mt-1 block text-xs font-medium leading-5 text-text-secondary">
                      {action.detail}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm font-medium leading-5 text-text-secondary">
            <div className="rounded-md bg-surface px-3 py-3">
              <span className="block text-lg font-semibold leading-6 text-text-primary">
                {totalJobs}
              </span>
              jobs saved
            </div>
            <div className="rounded-md bg-surface px-3 py-3">
              <span className="block text-lg font-semibold leading-6 text-text-primary">
                {averageMatch}
              </span>
              avg match
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
