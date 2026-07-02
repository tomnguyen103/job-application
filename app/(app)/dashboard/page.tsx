import { Suspense, type ReactElement } from "react";

import { IncompleteProfileBanner } from "@/components/dashboard/IncompleteProfileBanner";
import { JobsOverTimeChart } from "@/components/dashboard/JobsOverTimeChart";
import { MatchDistributionChart } from "@/components/dashboard/MatchDistributionChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import type { ActivityEntry } from "@/components/dashboard/RecentActivity";
import { ResearchActivityChart } from "@/components/dashboard/ResearchActivityChart";
import { SkillGapInsights } from "@/components/dashboard/SkillGapInsights";
import {
  DASHBOARD_STAT_LABELS,
  StatsBar,
} from "@/components/dashboard/StatsBar";
import type { DashboardStat } from "@/components/dashboard/StatsBar";
import { TodayWorkspace } from "@/components/dashboard/TodayWorkspace";
import {
  buildRecentActivityItems,
  type CompletedRunRow,
  type ResearchedJobRow,
} from "@/lib/dashboard-activity";
import {
  computeYAxis,
  fetchJobsOverTime,
  fetchMatchDistribution,
  fetchResearchActivity,
  hasAnyCount,
  type YAxisConfig,
} from "@/lib/dashboard-charts";
import {
  computeDashboardStatValues,
  type DashboardJobStatsAggregateRow,
} from "@/lib/dashboard-stats";
import {
  buildSkillGapInsights,
  buildTodayActions,
  type EngagementJob,
  type EngagementTailoredResume,
  type SkillGapInsight,
  type TodayAction,
} from "@/lib/engagement-insights";
import {
  createInsforgeServer,
  requireCurrentUser,
} from "@/lib/insforge-server";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProfileCompletionRow = {
  is_complete: boolean | null;
  resume_pdf_url: string | null;
};

type DashboardEngagementJobRow = {
  id: string;
  title: string | null;
  company: string | null;
  match_score: number | null;
  missing_skills: string[] | null;
  researched_at: string | null;
};

type DashboardTailoredResumeRow = {
  job_id: string | null;
  expires_at: string | null;
};

function buildStats(values: {
  totalJobsFound: string;
  avgMatchRate: string;
  companiesResearched: string;
  jobsThisWeek: string;
}): DashboardStat[] {
  return [
    {
      label: DASHBOARD_STAT_LABELS.TOTAL_JOBS,
      value: values.totalJobsFound,
      caption: "All time",
    },
    {
      label: DASHBOARD_STAT_LABELS.AVG_MATCH,
      value: values.avgMatchRate,
      caption: "Across all jobs",
    },
    {
      label: DASHBOARD_STAT_LABELS.COMPANIES,
      value: values.companiesResearched,
      caption: "Total researched",
    },
    {
      label: DASHBOARD_STAT_LABELS.JOBS_WEEK,
      value: values.jobsThisWeek,
      caption: "New this week",
    },
  ];
}

const CHART_LOAD_ERROR_MESSAGE =
  "Could not load chart data. Refresh the page to try again.";
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

function chartYAxis(points: { count: number }[]): YAxisConfig {
  return computeYAxis(
    points.reduce((max, point) => Math.max(max, point.count), 0),
  );
}

function clampScore(score: number | null): number {
  if (score === null || !Number.isFinite(score)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

function mapEngagementJobRow(row: DashboardEngagementJobRow): EngagementJob {
  return {
    id: row.id,
    title: row.title?.trim() || "Untitled role",
    company: row.company?.trim() || "Unknown company",
    matchScore: clampScore(row.match_score),
    missingSkills: (row.missing_skills ?? [])
      .map((skill) => skill.trim())
      .filter(Boolean),
    researchedAt: row.researched_at,
  };
}

function mapTailoredResumeRow(
  row: DashboardTailoredResumeRow,
): EngagementTailoredResume | null {
  if (!row.job_id) {
    return null;
  }

  return {
    jobId: row.job_id,
    expiresAt: row.expires_at,
  };
}

function ChartCardSkeleton({ title }: { title: string }): ReactElement {
  return (
    <section
      role="status"
      aria-label={`${title} loading`}
      className="h-full rounded-md border border-border bg-surface-elevated p-6 shadow-card"
    >
      <h2 className="text-base font-semibold leading-6 text-text-primary">
        {title}
      </h2>
      <div className="mt-2 h-4 w-48 animate-pulse rounded-md bg-surface-secondary" />
      <div className="mt-6 h-[280px] animate-pulse rounded-md bg-surface-secondary" />
      <span className="sr-only">Loading {title}.</span>
    </section>
  );
}

async function ResearchActivityChartCard({
  userId,
  now,
}: {
  userId: string;
  now: Date;
}): Promise<ReactElement> {
  const researchActivityResult = await fetchResearchActivity(userId, now);
  const researchActivityData = hasAnyCount(researchActivityResult)
    ? researchActivityResult
    : [];

  return (
    <ResearchActivityChart
      data={researchActivityData}
      yAxis={chartYAxis(researchActivityData)}
      emptyMessage={
        researchActivityResult === null ? CHART_LOAD_ERROR_MESSAGE : undefined
      }
    />
  );
}

async function JobsOverTimeChartCard({
  userId,
  now,
}: {
  userId: string;
  now: Date;
}): Promise<ReactElement> {
  const jobsOverTimeResult = await fetchJobsOverTime(userId, now);
  const jobsOverTimeData = hasAnyCount(jobsOverTimeResult)
    ? jobsOverTimeResult
    : [];

  return (
    <JobsOverTimeChart
      data={jobsOverTimeData}
      yAxis={chartYAxis(jobsOverTimeData)}
      emptyMessage={
        jobsOverTimeResult === null ? CHART_LOAD_ERROR_MESSAGE : undefined
      }
    />
  );
}

async function MatchDistributionChartCard({
  userId,
}: {
  userId: string;
}): Promise<ReactElement> {
  const matchDistributionResult = await fetchMatchDistribution(userId);
  const matchDistributionData = hasAnyCount(matchDistributionResult)
    ? matchDistributionResult
    : [];

  return (
    <MatchDistributionChart
      data={matchDistributionData}
      yAxis={chartYAxis(matchDistributionData)}
      emptyMessage={
        matchDistributionResult === null
          ? CHART_LOAD_ERROR_MESSAGE
          : undefined
      }
    />
  );
}

export default async function DashboardPage(): Promise<ReactElement> {
  const user = await requireCurrentUser();
  const insforge = await createInsforgeServer();
  const now = new Date();
  const weekCutoff = new Date(now.getTime() - WEEK_IN_MS).toISOString();

  const [
    profileResult,
    statsAggregateResult,
    jobsThisWeekResult,
    runsResult,
    researchedResult,
    engagementJobsResult,
    tailoredResumesResult,
  ] = await Promise.all([
    insforge.database
      .from("profiles")
      .select("is_complete, resume_pdf_url")
      .eq("id", user.id)
      .maybeSingle(),
    insforge.database
      .rpc("get_dashboard_job_stats", { p_user_id: user.id })
      .maybeSingle(),
    insforge.database
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("found_at", weekCutoff),
    insforge.database
      .from("agent_runs")
      .select("id, job_title_searched, jobs_found, completed_at, started_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(5),
    // PostgREST not.is.null via the or() filter tree, same SDK pathway
    // Feature 11 already relies on for or(ilike) search.
    insforge.database
      .from("jobs")
      .select("id, company, researched_at")
      .eq("user_id", user.id)
      .or("researched_at.not.is.null")
      .order("researched_at", { ascending: false })
      .limit(5),
    insforge.database
      .from("jobs")
      .select("id, title, company, match_score, missing_skills, researched_at")
      .eq("user_id", user.id)
      .order("match_score", { ascending: false })
      .limit(20),
    insforge.database
      .from("tailored_resumes")
      .select("job_id, expires_at")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(50),
  ]);

  const profileLoadFailed = Boolean(profileResult.error);

  if (profileLoadFailed) {
    console.error("[dashboard] profile read error:", profileResult.error);
  }

  // Boundary assertion on the SDK row shape, column selected above.
  const profileRow = (profileResult.data ?? null) as ProfileCompletionRow | null;
  const profileComplete =
    !profileLoadFailed && profileRow?.is_complete === true;
  const showIncompleteProfileBanner = !profileLoadFailed && !profileComplete;
  const hasResume = !profileLoadFailed && Boolean(profileRow?.resume_pdf_url);

  const statsLoadFailed =
    Boolean(statsAggregateResult.error) || Boolean(jobsThisWeekResult.error);

  let stats: DashboardStat[];

  if (statsLoadFailed) {
    console.error(
      "[dashboard] stats read error:",
      statsAggregateResult.error ?? jobsThisWeekResult.error,
    );
    stats = buildStats({
      totalJobsFound: "-",
      avgMatchRate: "-",
      companiesResearched: "-",
      jobsThisWeek: "-",
    });
  } else {
    // Boundary assertion on the aggregate RPC row shape.
    const aggregate = (statsAggregateResult.data ??
      null) as DashboardJobStatsAggregateRow | null;
    const values = computeDashboardStatValues({
      aggregate,
      jobsThisWeekCount: jobsThisWeekResult.count ?? 0,
    });
    stats = buildStats({
      totalJobsFound: String(values.totalJobsFound),
      avgMatchRate:
        values.avgMatchRate === null ? "-" : `${values.avgMatchRate}%`,
      companiesResearched: String(values.companiesResearched),
      jobsThisWeek: String(values.jobsThisWeek),
    });
  }

  const activityLoadFailed =
    Boolean(runsResult.error) || Boolean(researchedResult.error);

  let activityEntries: ActivityEntry[] = [];

  if (activityLoadFailed) {
    console.error(
      "[dashboard] activity read error:",
      runsResult.error ?? researchedResult.error,
    );
  } else {
    // Boundary assertions on the SDK row shapes, columns selected above.
    const items = buildRecentActivityItems({
      runs: (runsResult.data ?? []) as CompletedRunRow[],
      researchedJobs: (researchedResult.data ?? []) as ResearchedJobRow[],
    });
    activityEntries = items.map((item) => ({
      id: item.id,
      title: item.title,
      timestamp: formatRelativeTime(item.occurredAt),
      tone: item.tone,
    }));
  }

  const engagementJobsLoadFailed = Boolean(engagementJobsResult.error);
  const tailoredResumesLoadFailed = Boolean(tailoredResumesResult.error);
  const todayActionsLoadFailed =
    profileLoadFailed || engagementJobsLoadFailed || tailoredResumesLoadFailed;

  let todayActions: TodayAction[] = [];
  let skillGapInsights: SkillGapInsight[] = [];

  if (engagementJobsLoadFailed) {
    console.error(
      "[dashboard] engagement jobs read error:",
      engagementJobsResult.error,
    );
  } else {
    // Boundary assertions on the SDK row shapes, columns selected above.
    const engagementJobs = (
      engagementJobsResult.data ?? []
    ).map((row) => mapEngagementJobRow(row as DashboardEngagementJobRow));

    skillGapInsights = buildSkillGapInsights(engagementJobs);

    if (tailoredResumesLoadFailed) {
      console.error(
        "[dashboard] tailored resume engagement read error:",
        tailoredResumesResult.error,
      );
    } else if (!profileLoadFailed) {
      const tailoredResumes = (tailoredResumesResult.data ?? [])
        .map((row) =>
          mapTailoredResumeRow(row as DashboardTailoredResumeRow),
        )
        .filter(
          (resume): resume is EngagementTailoredResume => resume !== null,
        );

      todayActions = buildTodayActions({
        profileComplete,
        hasResume,
        jobs: engagementJobs,
        tailoredResumes,
        now,
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <TodayWorkspace
        profileComplete={profileComplete}
        profileLoadFailed={profileLoadFailed}
        actions={todayActions}
        actionsLoadFailed={todayActionsLoadFailed}
      />
      {showIncompleteProfileBanner ? <IncompleteProfileBanner /> : null}
      <StatsBar stats={stats} />
      <SkillGapInsights
        insights={skillGapInsights}
        loadFailed={engagementJobsLoadFailed}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentActivity
          entries={activityEntries}
          emptyMessage={
            activityLoadFailed
              ? "Could not load your recent activity. Refresh the page to try again."
              : undefined
          }
        />
        <Suspense
          fallback={<ChartCardSkeleton title="Company Research Activity" />}
        >
          <ResearchActivityChartCard userId={user.id} now={now} />
        </Suspense>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartCardSkeleton title="Jobs Found Over Time" />}>
            <JobsOverTimeChartCard userId={user.id} now={now} />
          </Suspense>
        </div>
        <Suspense
          fallback={<ChartCardSkeleton title="Match Score Distribution" />}
        >
          <MatchDistributionChartCard userId={user.id} />
        </Suspense>
      </div>
    </div>
  );
}
