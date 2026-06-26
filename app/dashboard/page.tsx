import type { ReactElement } from "react";

import { getUserEntitlement } from "@/lib/billing/entitlements";
import { getCurrentPeriodUsage } from "@/lib/billing/usage";
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
import { Navbar } from "@/components/layout/Navbar";
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
  type DashboardJobStatRow,
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

export default async function DashboardPage(): Promise<ReactElement> {
  const user = await requireCurrentUser();
  const insforge = await createInsforgeServer();
  const now = new Date();

  const entitlement = await getUserEntitlement(user.id);

  const [
    profileResult,
    jobsResult,
    unresearchedResult,
    runsResult,
    researchedResult,
    engagementJobsResult,
    tailoredResumesResult,
    jobsOverTimeResult,
    matchDistributionResult,
    researchActivityResult,
    usage,
  ] = await Promise.all([
    insforge.database
      .from("profiles")
      .select("is_complete, resume_pdf_url")
      .eq("id", user.id)
      .maybeSingle(),
    insforge.database
      .from("jobs")
      .select("match_score, found_at", { count: "exact" })
      .eq("user_id", user.id),
    // Researched count = total minus IS NULL count; the SDK has no documented
    // IS NOT NULL filter and this avoids fetching company_research jsonb.
    insforge.database
      .from("jobs")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .is("company_research", null)
      .limit(1),
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
    fetchJobsOverTime(user.id, now),
    fetchMatchDistribution(user.id),
    fetchResearchActivity(user.id, now),
    getCurrentPeriodUsage(user.id, entitlement),
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
    Boolean(jobsResult.error) || Boolean(unresearchedResult.error);

  let stats: DashboardStat[];

  if (statsLoadFailed) {
    console.error(
      "[dashboard] stats read error:",
      jobsResult.error ?? unresearchedResult.error,
    );
    stats = buildStats({
      totalJobsFound: "-",
      avgMatchRate: "-",
      companiesResearched: "-",
      jobsThisWeek: "-",
    });
  } else {
    // Boundary assertion on the SDK row shape, columns selected above.
    const rows = (jobsResult.data ?? []) as DashboardJobStatRow[];
    const values = computeDashboardStatValues({
      rows,
      totalCount: jobsResult.count ?? rows.length,
      unresearchedCount: unresearchedResult.count ?? 0,
      now,
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

  // Charts render real data only when at least one bucket is non-zero;
  // a null fetch result (query/config failure) shows the error message
  // and an all-zero result falls back to each chart's no-data default.
  const jobsOverTimeData = hasAnyCount(jobsOverTimeResult)
    ? jobsOverTimeResult
    : [];
  const matchDistributionData = hasAnyCount(matchDistributionResult)
    ? matchDistributionResult
    : [];
  const researchActivityData = hasAnyCount(researchActivityResult)
    ? researchActivityResult
    : [];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-0">
        <div className="flex flex-col gap-6">
          <TodayWorkspace
            profileComplete={profileComplete}
            profileLoadFailed={profileLoadFailed}
            stats={stats}
            actions={todayActions}
            actionsLoadFailed={todayActionsLoadFailed}
            entitlement={entitlement}
            usage={usage}
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
            <ResearchActivityChart
              data={researchActivityData}
              yAxis={chartYAxis(researchActivityData)}
              emptyMessage={
                researchActivityResult === null
                  ? CHART_LOAD_ERROR_MESSAGE
                  : undefined
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <JobsOverTimeChart
                data={jobsOverTimeData}
                yAxis={chartYAxis(jobsOverTimeData)}
                emptyMessage={
                  jobsOverTimeResult === null
                    ? CHART_LOAD_ERROR_MESSAGE
                    : undefined
                }
              />
            </div>
            <MatchDistributionChart
              data={matchDistributionData}
              yAxis={chartYAxis(matchDistributionData)}
              emptyMessage={
                matchDistributionResult === null
                  ? CHART_LOAD_ERROR_MESSAGE
                  : undefined
              }
            />
          </div>
        </div>
      </section>
    </main>
  );
}
