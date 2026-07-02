export type DashboardJobStatsAggregateRow = {
  total_jobs_found: number | string | null;
  avg_match_rate: number | string | null;
  companies_researched: number | string | null;
};

export type DashboardStatValues = {
  totalJobsFound: number;
  avgMatchRate: number | null;
  companiesResearched: number;
  jobsThisWeek: number;
};

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toCount(value: number | string | null | undefined): number {
  const parsed = toFiniteNumber(value);
  return parsed === null ? 0 : Math.max(0, Math.trunc(parsed));
}

export function computeDashboardStatValues(args: {
  aggregate: DashboardJobStatsAggregateRow | null;
  jobsThisWeekCount: number | null;
}): DashboardStatValues {
  const { aggregate, jobsThisWeekCount } = args;
  const avgMatchRate = toFiniteNumber(aggregate?.avg_match_rate);

  return {
    totalJobsFound: toCount(aggregate?.total_jobs_found),
    avgMatchRate: avgMatchRate === null ? null : Math.round(avgMatchRate),
    companiesResearched: toCount(aggregate?.companies_researched),
    jobsThisWeek: toCount(jobsThisWeekCount),
  };
}
