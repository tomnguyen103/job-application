import { scoreJobMatch } from "@/agent/matcher";
import { getEnabledJobSourceProviders } from "@/agent/job-sources";
import type {
  DiscoveryResult,
  DiscoverySourceSummary,
  JobMatchContent,
  JobSearchInput,
  JobSourceKey,
  JobSourceProvider,
  NormalizedJobPosting,
  SavedJob,
} from "@/agent/types";
import { createInsforgeServer } from "@/lib/insforge-server";
import { MATCH_THRESHOLD } from "@/lib/utils";
import type { Profile } from "@/types";

const DEFAULT_RESULTS_PER_SOURCE = 10;
const SCORING_BATCH_SIZE = 4;

type InsforgeServer = Awaited<ReturnType<typeof createInsforgeServer>>;

type LogLevel = "info" | "success" | "warning" | "error";

type DiscoverJobsArgs = {
  insforge: InsforgeServer;
  userId: string;
  runId: string;
  profile: Profile;
  jobTitle: string;
  location: string;
  scoreLimit: number;
};

export type ProviderSearchOutcome = {
  provider: JobSourceKey;
  displayName: string;
  postings: NormalizedJobPosting[];
  error?: string;
};

type ExistingJobRow = {
  source_url?: string | null;
  source_provider?: string | null;
  source_provider_job_id?: string | null;
};

async function logAgentEvent(
  insforge: InsforgeServer,
  entry: {
    runId: string;
    userId: string;
    message: string;
    level: LogLevel;
    jobId?: string;
  },
): Promise<void> {
  const { error } = await insforge.database.from("agent_logs").insert([
    {
      run_id: entry.runId,
      user_id: entry.userId,
      message: entry.message,
      level: entry.level,
      job_id: entry.jobId ?? null,
    },
  ]);

  if (error) {
    console.error("[agent/job-discovery] failed to write agent log:", error);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function newSourceSummary(
  provider: JobSourceProvider,
): DiscoverySourceSummary {
  return {
    provider: provider.key,
    displayName: provider.displayName,
    found: 0,
    saved: 0,
    strongMatches: 0,
  };
}

function getSummary(
  summaries: Map<JobSourceKey, DiscoverySourceSummary>,
  provider: JobSourceKey,
): DiscoverySourceSummary {
  const summary = summaries.get(provider);
  if (!summary) {
    throw new Error(`Missing source summary for ${provider}`);
  }

  return summary;
}

export async function searchProviders(
  providers: JobSourceProvider[],
  input: JobSearchInput,
): Promise<ProviderSearchOutcome[]> {
  const outcomes = await Promise.all(
    providers.map(async (provider) => {
      if (!provider.isConfigured()) {
        return {
          provider: provider.key,
          displayName: provider.displayName,
          postings: [],
          error: "Source is enabled but not configured.",
        };
      }

      try {
        const postings = await provider.search(input);
        return {
          provider: provider.key,
          displayName: provider.displayName,
          postings,
        };
      } catch (error) {
        return {
          provider: provider.key,
          displayName: provider.displayName,
          postings: [],
          error: errorMessage(error),
        };
      }
    }),
  );

  return outcomes;
}

export function postingDedupeKeys(posting: NormalizedJobPosting): string[] {
  return [
    posting.providerJobId
      ? `${posting.provider}:${posting.providerJobId}`
      : `${posting.provider}:${posting.sourceUrl}`,
    `url:${posting.sourceUrl}`,
  ];
}

export function existingDedupeKeys(rows: ExistingJobRow[]): Set<string> {
  const keys = new Set<string>();

  for (const row of rows) {
    if (row.source_url) {
      keys.add(`url:${row.source_url}`);
    }
    if (row.source_provider && row.source_provider_job_id) {
      keys.add(`${row.source_provider}:${row.source_provider_job_id}`);
    }
  }

  return keys;
}

export function dedupePostings(
  postings: NormalizedJobPosting[],
  existingRows: ExistingJobRow[],
): { newPostings: NormalizedJobPosting[]; skippedDuplicates: number } {
  const seen = existingDedupeKeys(existingRows);
  const newPostings: NormalizedJobPosting[] = [];
  let skippedDuplicates = 0;

  for (const posting of postings) {
    const keys = postingDedupeKeys(posting);
    const isDuplicate = keys.some((key) => seen.has(key));

    if (isDuplicate) {
      skippedDuplicates += 1;
      continue;
    }

    for (const key of keys) {
      seen.add(key);
    }
    newPostings.push(posting);
  }

  return { newPostings, skippedDuplicates };
}

export function selectPostingsForScoring(
  postings: NormalizedJobPosting[],
  scoreLimit: number,
): { jobsToScore: NormalizedJobPosting[]; skippedForQuota: number } {
  const jobsToScore = postings.slice(0, Math.max(0, scoreLimit));
  return {
    jobsToScore,
    skippedForQuota: Math.max(0, postings.length - jobsToScore.length),
  };
}

async function loadExistingRows(
  insforge: InsforgeServer,
  userId: string,
  postings: NormalizedJobPosting[],
): Promise<ExistingJobRow[]> {
  const sourceUrls = Array.from(
    new Set(postings.map((posting) => posting.sourceUrl).filter(Boolean)),
  );

  if (sourceUrls.length === 0) {
    return [];
  }

  const { data, error } = await insforge.database
    .from("jobs")
    .select("source_url, source_provider, source_provider_job_id")
    .eq("user_id", userId)
    .in("source_url", sourceUrls);

  if (error) {
    throw new Error(`Duplicate check failed: ${error.message}`);
  }

  return (data ?? []) as ExistingJobRow[];
}

async function saveJob(
  insforge: InsforgeServer,
  args: {
    userId: string;
    runId: string;
    job: NormalizedJobPosting;
    match: JobMatchContent;
  },
): Promise<SavedJob | null> {
  const { userId, runId, job, match } = args;

  const { data, error } = await insforge.database
    .from("jobs")
    .insert([
      {
        user_id: userId,
        run_id: runId,
        source: "search",
        source_url: job.sourceUrl,
        external_apply_url: job.applyUrl,
        source_provider: job.provider,
        source_display_name: job.sourceDisplayName,
        source_provider_job_id: job.providerJobId,
        posted_at: job.postedAt,
        source_metadata: job.metadata,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        job_type: job.jobType || "fulltime",
        about_role: job.description,
        match_score: match.matchScore,
        match_reason: match.matchReason,
        matched_skills: match.matchedSkills,
        missing_skills: match.missingSkills,
        found_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("[agent/job-discovery] job insert failed:", error);
    return null;
  }

  const row = data as { id?: string } | null;

  if (!row?.id) {
    console.error("[agent/job-discovery] job insert returned no id");
    return null;
  }

  return {
    id: row.id,
    matchScore: match.matchScore,
    sourceProvider: job.provider,
    sourceDisplayName: job.sourceDisplayName,
  };
}

export async function discoverJobs(
  args: DiscoverJobsArgs,
): Promise<
  { success: true; result: DiscoveryResult } | { success: false; error: string }
> {
  const {
    insforge,
    userId,
    runId,
    profile,
    jobTitle,
    location,
    scoreLimit,
  } = args;

  try {
    const providers = getEnabledJobSourceProviders();

    if (providers.length === 0) {
      await logAgentEvent(insforge, {
        runId,
        userId,
        level: "error",
        message: "No job sources are enabled.",
      });
      return { success: false, error: "No job sources are enabled." };
    }

    const summaries = new Map(
      providers.map((provider) => [provider.key, newSourceSummary(provider)]),
    );

    await logAgentEvent(insforge, {
      runId,
      userId,
      level: "info",
      message: `Searching ${providers
        .map((provider) => provider.displayName)
        .join(", ")} for "${jobTitle}"${location ? ` in ${location}` : ""}.`,
    });

    const searchOutcomes = await searchProviders(providers, {
      jobTitle,
      location,
      limit: DEFAULT_RESULTS_PER_SOURCE,
    });

    for (const outcome of searchOutcomes) {
      const summary = getSummary(summaries, outcome.provider);
      summary.found = outcome.postings.length;
      if (outcome.error) {
        summary.error = outcome.error;
        await logAgentEvent(insforge, {
          runId,
          userId,
          level: "warning",
          message: `${outcome.displayName} search failed: ${outcome.error}`,
        });
      } else {
        await logAgentEvent(insforge, {
          runId,
          userId,
          level: "info",
          message: `${outcome.displayName} returned ${outcome.postings.length} usable job(s).`,
        });
      }
    }

    const successfulOutcomes = searchOutcomes.filter(
      (outcome) => !outcome.error,
    );

    if (successfulOutcomes.length === 0) {
      await logAgentEvent(insforge, {
        runId,
        userId,
        level: "error",
        message: "Run failed - all enabled job sources failed.",
      });
      return {
        success: false,
        error: "All enabled job sources failed.",
      };
    }

    const allPostings = searchOutcomes.flatMap((outcome) => outcome.postings);
    let existingRows: ExistingJobRow[] = [];

    try {
      existingRows = await loadExistingRows(insforge, userId, allPostings);
    } catch (error) {
      console.error("[agent/job-discovery] duplicate check failed:", error);
      await logAgentEvent(insforge, {
        runId,
        userId,
        level: "warning",
        message: "Could not check for already-saved jobs - duplicates may appear.",
      });
    }

    const { newPostings, skippedDuplicates } = dedupePostings(
      allPostings,
      existingRows,
    );

    if (skippedDuplicates > 0) {
      await logAgentEvent(insforge, {
        runId,
        userId,
        level: "info",
        message: `Skipped ${skippedDuplicates} job(s) already in your list.`,
      });
    }

    const { jobsToScore, skippedForQuota } = selectPostingsForScoring(
      newPostings,
      scoreLimit,
    );

    if (skippedForQuota > 0) {
      await logAgentEvent(insforge, {
        runId,
        userId,
        level: "warning",
        message: `Skipped ${skippedForQuota} new job(s) because this run reached the scoring limit.`,
      });
    }

    const savedJobs: SavedJob[] = [];

    for (let i = 0; i < jobsToScore.length; i += SCORING_BATCH_SIZE) {
      const batch = jobsToScore.slice(i, i + SCORING_BATCH_SIZE);
      const outcomes = await Promise.allSettled(
        batch.map((job) => scoreJobMatch(profile, job)),
      );

      for (let index = 0; index < batch.length; index += 1) {
        const job = batch[index];
        const outcome = outcomes[index];

        if (outcome.status === "rejected") {
          console.error("[agent/job-discovery] scoring failed:", outcome.reason);
          await logAgentEvent(insforge, {
            runId,
            userId,
            level: "warning",
            message: `Could not score "${job.title}" at ${job.company} - skipped.`,
          });
          continue;
        }

        const saved = await saveJob(insforge, {
          userId,
          runId,
          job,
          match: outcome.value,
        });

        if (saved) {
          savedJobs.push(saved);
          const summary = getSummary(summaries, job.provider);
          summary.saved += 1;
          if (saved.matchScore >= MATCH_THRESHOLD) {
            summary.strongMatches += 1;
          }

          await logAgentEvent(insforge, {
            runId,
            userId,
            level: "success",
            message: `Saved "${job.title}" at ${job.company} from ${job.sourceDisplayName} - ${saved.matchScore}% match.`,
            jobId: saved.id,
          });
        } else {
          await logAgentEvent(insforge, {
            runId,
            userId,
            level: "error",
            message: `Failed to save "${job.title}" at ${job.company}.`,
          });
        }
      }
    }

    const strongMatches = savedJobs.filter(
      (savedJob) => savedJob.matchScore >= MATCH_THRESHOLD,
    ).length;
    const found = allPostings.length;

    await logAgentEvent(insforge, {
      runId,
      userId,
      level: "success",
      message: `Run complete - found ${found}, saved ${savedJobs.length} new job(s), ${strongMatches} strong match(es).`,
    });

    return {
      success: true,
      result: {
        found,
        saved: savedJobs.length,
        strongMatches,
        savedJobs,
        sources: Array.from(summaries.values()),
        skippedDuplicates,
        skippedForQuota,
      },
    };
  } catch (error) {
    console.error("[agent/job-discovery]", error);
    await logAgentEvent(insforge, {
      runId,
      userId,
      level: "error",
      message: "Job discovery run failed unexpectedly.",
    });
    return { success: false, error: String(error) };
  }
}
