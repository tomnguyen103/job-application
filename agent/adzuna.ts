import { scoreJobMatch } from "@/agent/matcher";
import type {
  AdzunaJob,
  DiscoveryResult,
  JobMatchContent,
  SavedJob,
  UsableAdzunaJob,
} from "@/agent/types";
import { canonicalSourceUrl, detectCountry, searchJobs } from "@/lib/adzuna";
import { createInsforgeServer } from "@/lib/insforge-server";
import { MATCH_THRESHOLD } from "@/lib/utils";
import type { Profile } from "@/types";

type InsforgeServer = Awaited<ReturnType<typeof createInsforgeServer>>;

type LogLevel = "info" | "success" | "warning" | "error";

type DiscoverJobsArgs = {
  insforge: InsforgeServer;
  userId: string;
  runId: string;
  profile: Profile;
  jobTitle: string;
  location: string;
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
    console.error("[agent/adzuna] failed to write agent log:", error);
  }
}

function isUsableJob(job: AdzunaJob): job is UsableAdzunaJob {
  return Boolean(
    job.title &&
      job.description &&
      job.redirect_url &&
      job.company?.display_name,
  );
}

function formatSalary(job: UsableAdzunaJob): string | null {
  const toK = (value: number): string => `$${Math.round(value / 1000)}k`;

  if (job.salary_min && job.salary_max) {
    return toK(job.salary_min) === toK(job.salary_max)
      ? toK(job.salary_min)
      : `${toK(job.salary_min)} - ${toK(job.salary_max)}`;
  }

  if (job.salary_min) {
    return `${toK(job.salary_min)}+`;
  }

  if (job.salary_max) {
    return `Up to ${toK(job.salary_max)}`;
  }

  return null;
}

async function saveJob(
  insforge: InsforgeServer,
  args: {
    userId: string;
    runId: string;
    job: UsableAdzunaJob;
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
        source_url: canonicalSourceUrl(job.redirect_url),
        external_apply_url: job.redirect_url,
        title: job.title,
        company: job.company.display_name,
        location: job.location?.display_name ?? "",
        salary: formatSalary(job),
        job_type: job.contract_type || "fulltime",
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
    console.error("[agent/adzuna] job insert failed:", error);
    return null;
  }

  // Boundary assertion on the SDK row shape — only `id` was selected.
  const row = data as { id?: string } | null;

  if (!row?.id) {
    console.error("[agent/adzuna] job insert returned no id");
    return null;
  }

  return { id: row.id, matchScore: match.matchScore };
}

export async function discoverJobs(
  args: DiscoverJobsArgs,
): Promise<
  { success: true; result: DiscoveryResult } | { success: false; error: string }
> {
  const { insforge, userId, runId, profile, jobTitle, location } = args;

  try {
    const country = detectCountry(location);

    await logAgentEvent(insforge, {
      runId,
      userId,
      level: "info",
      message: `Searching Adzuna for "${jobTitle}"${location ? ` in ${location}` : ""} (${country}).`,
    });

    let results: AdzunaJob[];
    try {
      results = await searchJobs(jobTitle, location, country);
    } catch (error) {
      console.error("[agent/adzuna] Adzuna search failed:", error);
      await logAgentEvent(insforge, {
        runId,
        userId,
        level: "error",
        message: "Adzuna search failed — no jobs could be retrieved.",
      });
      return { success: false, error: "Adzuna search failed" };
    }

    const found = results.length;
    const usable = results.filter(isUsableJob);

    if (usable.length < results.length) {
      await logAgentEvent(insforge, {
        runId,
        userId,
        level: "warning",
        message: `Skipped ${results.length - usable.length} result(s) missing required fields.`,
      });
    }

    // Dedupe against already-saved jobs so repeat searches never re-score
    // or re-insert the same posting.
    const existingUrls = new Set<string>();
    const urls = usable.map((job) => canonicalSourceUrl(job.redirect_url));

    if (urls.length > 0) {
      const { data: existingData, error: existingError } =
        await insforge.database
          .from("jobs")
          .select("source_url")
          .eq("user_id", userId)
          .in("source_url", urls);

      if (existingError) {
        // Proceed without dedupe rather than failing the run — the worst
        // case is a duplicate row, not a lost search.
        console.error("[agent/adzuna] duplicate check failed:", existingError);
        await logAgentEvent(insforge, {
          runId,
          userId,
          level: "warning",
          message: "Could not check for already-saved jobs — duplicates may appear.",
        });
      } else {
        // Boundary assertion on the SDK row shape — only `source_url` was selected.
        const existingRows = (existingData ?? []) as {
          source_url?: string | null;
        }[];

        for (const existingRow of existingRows) {
          if (existingRow.source_url) {
            existingUrls.add(existingRow.source_url);
          }
        }
      }
    }

    const newJobs = usable.filter(
      (job) => !existingUrls.has(canonicalSourceUrl(job.redirect_url)),
    );
    const skippedDuplicates = usable.length - newJobs.length;

    if (skippedDuplicates > 0) {
      await logAgentEvent(insforge, {
        runId,
        userId,
        level: "info",
        message: `Skipped ${skippedDuplicates} job(s) already in your list.`,
      });
    }

    const savedJobs: SavedJob[] = [];

    // Adzuna returns at most 10 results — score them all concurrently.
    // The request count per run is the same as sequential, so this stays
    // within Gemini flash rate limits while cutting wall-clock ~4x.
    const outcomes = await Promise.allSettled(
      newJobs.map((job) => scoreJobMatch(profile, job)),
    );

    for (let i = 0; i < newJobs.length; i++) {
      const job = newJobs[i];
      const outcome = outcomes[i];

      if (outcome.status === "rejected") {
        console.error("[agent/adzuna] scoring failed:", outcome.reason);
        await logAgentEvent(insforge, {
          runId,
          userId,
          level: "warning",
          message: `Could not score "${job.title}" at ${job.company.display_name} — skipped.`,
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
        await logAgentEvent(insforge, {
          runId,
          userId,
          level: "success",
          message: `Saved "${job.title}" at ${job.company.display_name} — ${saved.matchScore}% match.`,
          jobId: saved.id,
        });
      } else {
        await logAgentEvent(insforge, {
          runId,
          userId,
          level: "error",
          message: `Failed to save "${job.title}" at ${job.company.display_name}.`,
        });
      }
    }

    const strongMatches = savedJobs.filter(
      (savedJob) => savedJob.matchScore >= MATCH_THRESHOLD,
    ).length;

    await logAgentEvent(insforge, {
      runId,
      userId,
      level: "success",
      message: `Run complete — found ${found}, saved ${savedJobs.length} new job(s), ${strongMatches} strong match(es).`,
    });

    return {
      success: true,
      result: {
        found,
        saved: savedJobs.length,
        strongMatches,
        savedJobs,
      },
    };
  } catch (error) {
    console.error("[agent/adzuna]", error);
    await logAgentEvent(insforge, {
      runId,
      userId,
      level: "error",
      message: "Job discovery run failed unexpectedly.",
    });
    return { success: false, error: String(error) };
  }
}
