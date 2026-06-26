import { unstable_cache } from "next/cache";

import { queryPostHogHogQL, type HogQLRow } from "@/lib/posthog-query";

export type DailyChartPoint = {
  day: string;
  count: number;
};

export type DistributionChartPoint = {
  range: string;
  count: number;
};

export type DailyCountRow = {
  /** Calendar day in `YYYY-MM-DD` form. */
  day: string;
  count: number;
};

export type ScoreCountRow = {
  score: number;
  count: number;
};

export type DailySeriesLabelStyle = "weekday" | "monthDay";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAY_MS = 24 * 60 * 60 * 1000;

export const MATCH_DISTRIBUTION_RANGES = [
  "<50%",
  "50-60%",
  "60-70%",
  "70-80%",
  "80-90%",
  "90-100%",
] as const;

/**
 * Fills a rolling window of calendar days with event counts, oldest first.
 *
 * Day keys are derived in UTC while PostHog buckets `toDate(timestamp)` in
 * the project timezone (US/Central) — late-evening events can drift one
 * column at the window edges, which is acceptable for these charts.
 */
export function buildDailySeries(options: {
  rows: DailyCountRow[];
  days: number;
  now: Date;
  labelStyle: DailySeriesLabelStyle;
}): DailyChartPoint[] {
  const { rows, days, now, labelStyle } = options;

  const countsByDay = new Map<string, number>();
  for (const row of rows) {
    const count = Number.isFinite(row.count) ? Math.max(0, row.count) : 0;
    countsByDay.set(row.day, (countsByDay.get(row.day) ?? 0) + count);
  }

  const points: DailyChartPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now.getTime() - i * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    const label =
      labelStyle === "weekday"
        ? WEEKDAY_LABELS[date.getUTCDay()]
        : `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCDate()}`;

    points.push({ day: label, count: countsByDay.get(key) ?? 0 });
  }

  return points;
}

/**
 * Groups match scores into the six dashboard ranges. Scores below 50 land
 * in the `<50%` bucket (real data goes well below the build plan's lowest
 * range); out-of-range values clamp into the nearest bucket.
 */
export function buildMatchDistribution(
  rows: ScoreCountRow[],
): DistributionChartPoint[] {
  const counts = MATCH_DISTRIBUTION_RANGES.map(() => 0);

  for (const row of rows) {
    if (!Number.isFinite(row.score) || !Number.isFinite(row.count)) {
      continue;
    }

    const bucket =
      row.score < 50
        ? 0
        : row.score >= 90
          ? 5
          : 1 + Math.floor((row.score - 50) / 10);

    counts[bucket] += Math.max(0, row.count);
  }

  return MATCH_DISTRIBUTION_RANGES.map((range, index) => ({
    range,
    count: counts[index],
  }));
}

const NICE_TICK_STEPS = [
  1, 2, 3, 5, 10, 15, 20, 25, 50, 100, 200, 250, 500, 1000,
];

export type YAxisConfig = {
  domain: [number, number];
  ticks: number[];
};

/**
 * Picks a "nice" five-tick Y axis covering maxCount, so charts keep the
 * house explicit ticks + domain style with real data of any scale.
 */
export function computeYAxis(maxCount: number): YAxisConfig {
  const safeMax = Math.max(1, Math.ceil(maxCount));
  const rawStep = safeMax / 4;
  const step =
    NICE_TICK_STEPS.find((candidate) => candidate >= rawStep) ??
    Math.ceil(rawStep / 1000) * 1000;
  const top = step * 4;

  return {
    domain: [0, top],
    ticks: [0, step, step * 2, step * 3, top],
  };
}

export function hasAnyCount(
  points: { count: number }[] | null,
): points is { count: number }[] {
  return points !== null && points.some((point) => point.count > 0);
}

function toDailyCountRows(rows: HogQLRow[]): DailyCountRow[] {
  return rows.map((row) => ({
    day: String(row[0] ?? "").slice(0, 10),
    count: Number(row[1] ?? 0),
  }));
}

function toScoreCountRows(rows: HogQLRow[]): ScoreCountRow[] {
  return rows.map((row) => ({
    score: Number(row[0]),
    count: Number(row[1] ?? 0),
  }));
}

const JOBS_OVER_TIME_DAYS = 30;
const RESEARCH_ACTIVITY_DAYS = 7;

type DailyChartEvent = "job_found" | "company_researched";

// Literal-union params keep this interpolation provably free of user
// input — anything user-supplied (userId) must go through HogQL `values`.
const DAILY_EVENT_COUNT_QUERY = (
  event: DailyChartEvent,
  days: typeof JOBS_OVER_TIME_DAYS | typeof RESEARCH_ACTIVITY_DAYS,
): string =>
  `SELECT toDate(timestamp) AS day, count() AS c
   FROM events
   WHERE event = '${event}'
     AND distinct_id = {userId}
     AND timestamp >= now() - INTERVAL ${days} DAY
   GROUP BY day
   ORDER BY day`;

const getCachedJobsOverTimeRaw = unstable_cache(
  async (userId: string) => {
    const res = await queryPostHogHogQL(
      DAILY_EVENT_COUNT_QUERY("job_found", JOBS_OVER_TIME_DAYS),
      { userId },
    );
    if (res === null) {
      throw new Error("PostHog query failed for jobs over time");
    }
    return res;
  },
  ["posthog-jobs-over-time-raw"],
  { revalidate: 300 }
);

const getCachedResearchActivityRaw = unstable_cache(
  async (userId: string) => {
    const res = await queryPostHogHogQL(
      DAILY_EVENT_COUNT_QUERY("company_researched", RESEARCH_ACTIVITY_DAYS),
      { userId },
    );
    if (res === null) {
      throw new Error("PostHog query failed for research activity");
    }
    return res;
  },
  ["posthog-research-activity-raw"],
  { revalidate: 300 }
);

const getCachedMatchDistributionRaw = unstable_cache(
  async (userId: string) => {
    const res = await queryPostHogHogQL(
      `SELECT toFloat(properties.matchScore) AS score, count() AS c
       FROM events
       WHERE event = 'job_found'
         AND distinct_id = {userId}
       GROUP BY score`,
      { userId },
    );
    if (res === null) {
      throw new Error("PostHog query failed for match distribution");
    }
    return res;
  },
  ["posthog-match-distribution-raw"],
  { revalidate: 300 }
);

/** `job_found` events per day for the last 30 days. Null on query failure. */
export async function fetchJobsOverTime(
  userId: string,
  now: Date,
): Promise<DailyChartPoint[] | null> {
  try {
    const rows = await getCachedJobsOverTimeRaw(userId);
    return buildDailySeries({
      rows: toDailyCountRows(rows),
      days: JOBS_OVER_TIME_DAYS,
      now,
      labelStyle: "monthDay",
    });
  } catch (error) {
    console.error("[posthog/cache] fetchJobsOverTime failed:", error);
    return null;
  }
}

/** `company_researched` events per day for the last 7 days. Null on query failure. */
export async function fetchResearchActivity(
  userId: string,
  now: Date,
): Promise<DailyChartPoint[] | null> {
  try {
    const rows = await getCachedResearchActivityRaw(userId);
    return buildDailySeries({
      rows: toDailyCountRows(rows),
      days: RESEARCH_ACTIVITY_DAYS,
      now,
      labelStyle: "weekday",
    });
  } catch (error) {
    console.error("[posthog/cache] fetchResearchActivity failed:", error);
    return null;
  }
}

/** All-time matchScore distribution across `job_found` events. Null on query failure. */
export async function fetchMatchDistribution(
  userId: string,
): Promise<DistributionChartPoint[] | null> {
  try {
    const rows = await getCachedMatchDistributionRaw(userId);
    return buildMatchDistribution(toScoreCountRows(rows));
  } catch (error) {
    console.error("[posthog/cache] fetchMatchDistribution failed:", error);
    return null;
  }
}
