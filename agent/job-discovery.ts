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
import { recordUsage } from "@/lib/billing/usage";
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

async function loadRowsBySourceUrl(
  insforge: InsforgeServer,
  userId: string,
  sourceUrls: string[],
): Promise<ExistingJobRow[]> {
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

async function loadRowsByProviderJobId(
  insforge: InsforgeServer,
  userId: string,
  provider: string,
  providerJobIds: string[],
): Promise<ExistingJobRow[]> {
  if (providerJobIds.length === 0) {
    return [];
  }

  const { data, error } = await insforge.database
    .from("jobs")
    .select("source_url, source_provider, source_provider_job_id")
    .eq("user_id", userId)
    .eq("source_provider", provider)
    .in("source_provider_job_id", providerJobIds);

  if (error) {
    throw new Error(`Duplicate check failed: ${error.message}`);
  }

  return (data ?? []) as ExistingJobRow[];
}

// Matches existing rows by canonical URL AND, separately, by provider-native
// job id — a posting can change URL (tracking params, redirect rotation)
// while keeping the same provider id, and matching by URL alone would miss it.
async function loadExistingRows(
  insforge: InsforgeServer,
  userId: string,
  postings: NormalizedJobPosting[],
): Promise<ExistingJobRow[]> {
  const sourceUrls = Array.from(
    new Set(postings.map((posting) => posting.sourceUrl).filter(Boolean)),
  );

  const providerJobIdsByProvider = new Map<string, Set<string>>();
  for (const posting of postings) {
    if (!posting.providerJobId) {
      continue;
    }
    const ids = providerJobIdsByProvider.get(posting.provider) ?? new Set<string>();
    ids.add(posting.providerJobId);
    providerJobIdsByProvider.set(posting.provider, ids);
  }

  const [byUrl, ...byProviderJobId] = await Promise.all([
    loadRowsBySourceUrl(insforge, userId, sourceUrls),
    ...Array.from(providerJobIdsByProvider.entries()).map(([provider, ids]) =>
      loadRowsByProviderJobId(insforge, userId, provider, Array.from(ids)),
    ),
  ]);

  return [byUrl, ...byProviderJobId].flat();
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
        job_type: job.jobType || null,
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

    const selectedForScoring = selectPostingsForScoring(
      newPostings,
      scoreLimit,
    );
    const skippedForRunLimit = selectedForScoring.skippedForQuota;
    let skippedForQuota = selectedForScoring.skippedForQuota;
    let skippedForUserQuota = 0;
    const savedJobs: SavedJob[] = [];
    let reservationErrors = 0;

    for (let i = 0; i < selectedForScoring.jobsToScore.length; i += SCORING_BATCH_SIZE) {
      const batch = selectedForScoring.jobsToScore.slice(i, i + SCORING_BATCH_SIZE);
      const reservedBatch: NormalizedJobPosting[] = [];
      let quotaBlocked = false;

      for (let batchOffset = 0; batchOffset < batch.length; batchOffset += 1) {
        const job = batch[batchOffset];
        const jobIndex = i + batchOffset;
        const jobUsageIdentity = job.providerJobId ?? job.sourceUrl;
        const reservation = await recordUsage(
          userId,
          "job_match_score",
          1,
          `run:${runId}:score:${job.provider}:${jobUsageIdentity}`,
          {
            jobTitle,
            location,
            provider: job.provider,
            providerJobId: job.providerJobId,
            title: job.title,
            company: job.company,
          },
          "/api/agent/find",
          runId,
        );

        if (!reservation.success) {
          if (reservation.code === "QUOTA_EXCEEDED") {
            const remainingJobs = selectedForScoring.jobsToScore.length - jobIndex;
            skippedForQuota += remainingJobs;
            skippedForUserQuota += remainingJobs;
            quotaBlocked = true;
            break;
          }

          reservationErrors += 1;
          console.error("[agent/job-discovery] score quota reservation failed:", reservation.error);
          await logAgentEvent(insforge, {
            runId,
            userId,
            level: "warning",
            message: `Could not reserve scoring quota for "${job.title}" at ${job.company} - skipped.`,
          });
          continue;
        }

        reservedBatch.push(job);
      }

      const outcomes = await Promise.allSettled(
        reservedBatch.map((job) => scoreJobMatch(profile, job)),
      );

      for (let index = 0; index < reservedBatch.length; index += 1) {
        const job = reservedBatch[index];
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

      if (quotaBlocked) {
        await logAgentEvent(insforge, {
          runId,
          userId,
          level: "warning",
          message: "Skipped remaining job scoring because your scoring quota was reached.",
        });
        break;
      }
    }

    if (reservationErrors > 0 && savedJobs.length === 0) {
      return {
        success: false,
        error: "Could not reserve job scoring quota.",
      };
    }

    if (skippedForRunLimit > 0) {
      await logAgentEvent(insforge, {
        runId,
        userId,
        level: "warning",
        message: `Skipped ${skippedForRunLimit} new job(s) because this run reached the scoring limit.`,
      });
    }

    if (skippedForUserQuota > 0) {
      await logAgentEvent(insforge, {
        runId,
        userId,
        level: "warning",
        message: `Skipped ${skippedForUserQuota} new job(s) because your scoring quota was reached.`,
      });
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
