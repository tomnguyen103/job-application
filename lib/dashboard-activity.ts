export type CompletedRunRow = {
  id: string;
  job_title_searched: string | null;
  jobs_found: number | null;
  completed_at: string | null;
  started_at: string | null;
};

export type ResearchedJobRow = {
  id: string;
  company: string | null;
  researched_at: string | null;
};

export type RecentActivityItem = {
  id: string;
  title: string;
  occurredAt: string;
  tone: "info" | "success";
};

const DEFAULT_LIMIT = 5;

function toEpoch(isoDate: string): number {
  return new Date(isoDate).getTime();
}

export function buildRecentActivityItems(args: {
  runs: CompletedRunRow[];
  researchedJobs: ResearchedJobRow[];
  limit?: number;
}): RecentActivityItem[] {
  const { runs, researchedJobs, limit = DEFAULT_LIMIT } = args;

  const runItems = runs.flatMap((run): RecentActivityItem[] => {
    const occurredAt = run.completed_at ?? run.started_at;
    if (!occurredAt || !Number.isFinite(toEpoch(occurredAt))) {
      return [];
    }
    const jobsFound = run.jobs_found ?? 0;
    const searched = run.job_title_searched?.trim() || "your search";
    return [
      {
        id: `run-${run.id}`,
        title: `Found ${jobsFound} ${jobsFound === 1 ? "job" : "jobs"} for ${searched}`,
        occurredAt,
        tone: "success",
      },
    ];
  });

  const researchItems = researchedJobs.flatMap(
    (job): RecentActivityItem[] => {
      const company = job.company?.trim();
      if (
        !company ||
        !job.researched_at ||
        !Number.isFinite(toEpoch(job.researched_at))
      ) {
        return [];
      }
      return [
        {
          id: `research-${job.id}`,
          title: `Researched ${company}`,
          occurredAt: job.researched_at,
          tone: "info",
        },
      ];
    },
  );

  return [...runItems, ...researchItems]
    .sort((a, b) => toEpoch(b.occurredAt) - toEpoch(a.occurredAt))
    .slice(0, limit);
}
