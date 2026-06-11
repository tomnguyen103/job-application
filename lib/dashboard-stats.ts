export type DashboardJobStatRow = {
  match_score: number | null;
  found_at: string | null;
};

export type DashboardStatValues = {
  totalJobsFound: number;
  avgMatchRate: number | null;
  companiesResearched: number;
  jobsThisWeek: number;
};

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export function computeDashboardStatValues(args: {
  rows: DashboardJobStatRow[];
  totalCount: number;
  unresearchedCount: number;
  now: Date;
}): DashboardStatValues {
  const { rows, totalCount, unresearchedCount, now } = args;

  const scores = rows
    .map((row) => row.match_score)
    .filter((score): score is number => typeof score === "number");

  const avgMatchRate =
    scores.length === 0
      ? null
      : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

  const weekCutoff = now.getTime() - WEEK_IN_MS;
  const jobsThisWeek = rows.filter((row) => {
    if (!row.found_at) {
      return false;
    }
    const foundAt = new Date(row.found_at).getTime();
    return Number.isFinite(foundAt) && foundAt >= weekCutoff;
  }).length;

  return {
    totalJobsFound: totalCount,
    avgMatchRate,
    companiesResearched: Math.max(0, totalCount - unresearchedCount),
    jobsThisWeek,
  };
}
