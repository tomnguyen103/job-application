import { scoreJobMatch } from "@/agent/matcher";
import { getEnabledJobSourceProviders } from "@/agent/job-sources";
import {
  dedupePostings,
  searchProviders,
  selectPostingsForScoring,
  type ExistingJobRow,
} from "@/agent/job-discovery-utils";
import type {
  DiscoveryResult,
  DiscoverySourceSummary,
  JobMatchContent,
  JobSourceKey,
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

type AgentLogEntry = {
  runId: string;
  userId: string;
  message: string;
  level: LogLevel;
  jobId?: string;
};

type ScoredJob = {
  job: NormalizedJobPosting;
  match: JobMatchContent;
};

type SavedJobWithPosting = SavedJob & {
  job: NormalizedJobPosting;
};

type DiscoverJobsArgs = {
  insforge: InsforgeServer;
  userId: string;
  runId: string;
  profile: Profile;
  jobTitle: string;
  location: string;
  scoreLimit: number;
};

async function insertAgentLogRows(
  insforge: InsforgeServer,
  entries: AgentLogEntry[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const { error } = await insforge.database.from("agent_logs").insert(
    entries.map((entry) => ({
      run_id: entry.runId,
      user_id: entry.userId,
      message: entry.message,
      level: entry.level,
      job_id: entry.jobId ?? null,
    })),
  );

  if (error) {
    console.error("[agent/job-discovery] failed to write agent log:", error);
  }
}

function queueAgentLogRows(
  insforge: InsforgeServer,
  entries: AgentLogEntry[],
): void {
  void insertAgentLogRows(insforge, entries).catch((error) => {
    console.error("[agent/job-discovery] failed to write agent log:", error);
  });
}

function newSourceSummary(
  provider: { key: JobSourceKey; displayName: string },
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

function jobDedupeKey(job: Pick<NormalizedJobPosting, "provider" | "providerJobId" | "sourceUrl">): string {
  return JSON.stringify([job.provider, job.providerJobId, job.sourceUrl]);
}

async function saveJobBatch(
  insforge: InsforgeServer,
  args: {
    userId: string;
    runId: string;
    scoredJobs: ScoredJob[];
  },
): Promise<{
  savedJobs: SavedJobWithPosting[];
  failedJobs: NormalizedJobPosting[];
}> {
  const { userId, runId, scoredJobs } = args;

  if (scoredJobs.length === 0) {
    return { savedJobs: [], failedJobs: [] };
  }

  const { data, error } = await insforge.database
    .from("jobs")
    .insert(
      scoredJobs.map(({ job, match }) => ({
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
      })),
    )
    .select(
      "id, match_score, source_provider, source_display_name, source_provider_job_id, source_url",
    );

  if (error) {
    console.error("[agent/job-discovery] job batch insert failed:", error);
    return {
      savedJobs: [],
      failedJobs: scoredJobs.map(({ job }) => job),
    };
  }

  const scoredByKey = new Map(
    scoredJobs.map((scored) => [jobDedupeKey(scored.job), scored]),
  );
  const insertedRows = (data ?? []) as {
    id?: string;
    match_score?: number | null;
    source_provider?: JobSourceKey | null;
    source_display_name?: string | null;
    source_provider_job_id?: string | null;
    source_url?: string | null;
  }[];
  const savedJobs: SavedJobWithPosting[] = [];
  const savedKeys = new Set<string>();

  for (const row of insertedRows) {
    const scored =
      row.source_provider && row.source_url
        ? scoredByKey.get(
            jobDedupeKey({
              provider: row.source_provider,
              providerJobId: row.source_provider_job_id ?? null,
              sourceUrl: row.source_url,
            }),
          )
        : null;

    if (!row.id || !scored) {
      console.error("[agent/job-discovery] job insert returned an unmapped row");
      continue;
    }

    savedKeys.add(jobDedupeKey(scored.job));
    savedJobs.push({
      id: row.id,
      matchScore: scored.match.matchScore,
      sourceProvider: scored.job.provider,
      sourceDisplayName: scored.job.sourceDisplayName,
      job: scored.job,
    });
  }

  return {
    savedJobs,
    failedJobs: scoredJobs
      .filter((scored) => !savedKeys.has(jobDedupeKey(scored.job)))
      .map(({ job }) => job),
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

  const pendingLogs: AgentLogEntry[] = [];
  const queueLog = (entry: AgentLogEntry): void => {
    pendingLogs.push(entry);
  };
  const flushLogs = (): void => {
    const entries = pendingLogs.splice(0);
    queueAgentLogRows(insforge, entries);
  };

  try {
    const providers = getEnabledJobSourceProviders();

    if (providers.length === 0) {
      queueLog({
        runId,
        userId,
        level: "error",
        message: "No job sources are enabled.",
      });
      flushLogs();
      return { success: false, error: "No job sources are enabled." };
    }

    const summaries = new Map(
      providers.map((provider) => [provider.key, newSourceSummary(provider)]),
    );

    queueLog({
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
        queueLog({
          runId,
          userId,
          level: "warning",
          message: `${outcome.displayName} search failed: ${outcome.error}`,
        });
      } else {
        queueLog({
          runId,
          userId,
          level: "info",
          message: `${outcome.displayName} returned ${outcome.postings.length} usable job(s).`,
        });
      }
    }
    flushLogs();

    const successfulOutcomes = searchOutcomes.filter(
      (outcome) => !outcome.error,
    );

    if (successfulOutcomes.length === 0) {
      queueLog({
        runId,
        userId,
        level: "error",
        message: "Run failed - all enabled job sources failed.",
      });
      flushLogs();
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
      queueLog({
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
      queueLog({
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

    for (
      let i = 0;
      i < selectedForScoring.jobsToScore.length;
      i += SCORING_BATCH_SIZE
    ) {
      const batch = selectedForScoring.jobsToScore.slice(i, i + SCORING_BATCH_SIZE);
      const reservedBatch: NormalizedJobPosting[] = [];
      let quotaBlocked = false;
      let quotaSkippedInBatch = 0;

      const reservationOutcomes = await Promise.allSettled(
        batch.map((job) => {
          const jobUsageIdentity = job.providerJobId ?? job.sourceUrl;

          return recordUsage(
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
        }),
      );

      for (let batchOffset = 0; batchOffset < batch.length; batchOffset += 1) {
        const job = batch[batchOffset];
        const reservationOutcome = reservationOutcomes[batchOffset];

        if (reservationOutcome.status === "rejected") {
          reservationErrors += 1;
          console.error(
            "[agent/job-discovery] score quota reservation failed:",
            reservationOutcome.reason,
          );
          queueLog({
            runId,
            userId,
            level: "warning",
            message: `Could not reserve scoring quota for "${job.title}" at ${job.company} - skipped.`,
          });
          continue;
        }

        const reservation = reservationOutcome.value;

        if (!reservation.success) {
          if (reservation.code === "QUOTA_EXCEEDED") {
            quotaBlocked = true;
            quotaSkippedInBatch += 1;
            continue;
          }

          reservationErrors += 1;
          console.error(
            "[agent/job-discovery] score quota reservation failed:",
            reservation.error,
          );
          queueLog({
            runId,
            userId,
            level: "warning",
            message: `Could not reserve scoring quota for "${job.title}" at ${job.company} - skipped.`,
          });
          continue;
        }

        reservedBatch.push(job);
      }

      if (quotaBlocked) {
        const futureJobs = Math.max(
          0,
          selectedForScoring.jobsToScore.length - (i + batch.length),
        );
        const skippedByQuota = quotaSkippedInBatch + futureJobs;
        skippedForQuota += skippedByQuota;
        skippedForUserQuota += skippedByQuota;
      }

      const outcomes = await Promise.allSettled(
        reservedBatch.map((job) => scoreJobMatch(profile, job)),
      );
      const scoredJobs: ScoredJob[] = [];

      for (let index = 0; index < reservedBatch.length; index += 1) {
        const job = reservedBatch[index];
        const outcome = outcomes[index];

        if (outcome.status === "rejected") {
          console.error("[agent/job-discovery] scoring failed:", outcome.reason);
          queueLog({
            runId,
            userId,
            level: "warning",
            message: `Could not score "${job.title}" at ${job.company} - skipped.`,
          });
          continue;
        }

        scoredJobs.push({ job, match: outcome.value });
      }

      const saveResult = await saveJobBatch(insforge, {
        userId,
        runId,
        scoredJobs,
      });

      for (const saved of saveResult.savedJobs) {
        savedJobs.push(saved);
        const summary = getSummary(summaries, saved.job.provider);
        summary.saved += 1;
        if (saved.matchScore >= MATCH_THRESHOLD) {
          summary.strongMatches += 1;
        }

        queueLog({
          runId,
          userId,
          level: "success",
          message: `Saved "${saved.job.title}" at ${saved.job.company} from ${saved.job.sourceDisplayName} - ${saved.matchScore}% match.`,
          jobId: saved.id,
        });
      }

      for (const failedJob of saveResult.failedJobs) {
        queueLog({
          runId,
          userId,
          level: "error",
          message: `Failed to save "${failedJob.title}" at ${failedJob.company}.`,
        });
      }

      if (quotaBlocked) {
        queueLog({
          runId,
          userId,
          level: "warning",
          message: "Skipped remaining job scoring because your scoring quota was reached.",
        });
        flushLogs();
        break;
      }

      flushLogs();
    }

    if (reservationErrors > 0 && savedJobs.length === 0) {
      flushLogs();
      return {
        success: false,
        error: "Could not reserve job scoring quota.",
      };
    }

    if (skippedForRunLimit > 0) {
      queueLog({
        runId,
        userId,
        level: "warning",
        message: `Skipped ${skippedForRunLimit} new job(s) because this run reached the scoring limit.`,
      });
    }

    if (skippedForUserQuota > 0) {
      queueLog({
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

    queueLog({
      runId,
      userId,
      level: "success",
      message: `Run complete - found ${found}, saved ${savedJobs.length} new job(s), ${strongMatches} strong match(es).`,
    });
    flushLogs();

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
    queueLog({
      runId,
      userId,
      level: "error",
      message: "Job discovery run failed unexpectedly.",
    });
    flushLogs();
    return { success: false, error: String(error) };
  }
}
