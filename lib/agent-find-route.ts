import { discoverJobs as discoverJobsDefault } from "@/agent/job-discovery";
import type { DiscoveryResult } from "@/agent/types";
import {
  checkQuotaAvailable as checkQuotaAvailableDefault,
  recordUsage as recordUsageDefault,
  type QuotaCheckResult,
  type RecordUsageResult,
} from "@/lib/billing/usage";
import type { createInsforgeServer } from "@/lib/insforge-server";
import type { PostHogProductEventProperties } from "@/lib/posthog-events";
import { capturePostHogServerEvent as capturePostHogServerEventDefault } from "@/lib/posthog-server";
import { mapProfileRowToProfile } from "@/lib/utils";
import type { Profile, ProfileRow } from "@/types";

type InsforgeServer = Awaited<ReturnType<typeof createInsforgeServer>>;

export type AgentFindUser = {
  id: string;
  email?: string | null;
};

export type AgentFindResult = {
  status: 200 | 400 | 401 | 402 | 500;
  body: Record<string, unknown>;
  revalidatePaths?: string[];
};

type DiscoverJobsFn = (args: {
  insforge: InsforgeServer;
  userId: string;
  runId: string;
  profile: Profile;
  jobTitle: string;
  location: string;
  scoreLimit: number;
}) => Promise<
  | { success: true; result: DiscoveryResult }
  | { success: false; error: string }
>;

type CheckQuotaAvailableFn = (
  userId: string,
  eventType: "job_match_score",
  quantity: number,
) => Promise<QuotaCheckResult>;

type RecordUsageFn = (
  userId: string,
  eventType: "job_search_run",
  quantity: number,
  idempotencyKey: string,
  metadata: Record<string, unknown>,
  sourceRoute: string,
  referenceId: string,
) => Promise<RecordUsageResult>;

type CaptureJobFoundEventFn = (
  event: "job_found",
  properties: PostHogProductEventProperties["job_found"],
) => Promise<void>;

export type ResolveAgentFindRouteArgs = {
  user: AgentFindUser | null;
  insforge: InsforgeServer | null;
  body: unknown;
  discoverJobs?: DiscoverJobsFn;
  checkQuotaAvailable?: CheckQuotaAvailableFn;
  recordUsage?: RecordUsageFn;
  captureJobFoundEvent?: CaptureJobFoundEventFn;
};

const MAX_JOBS_TO_SCORE_PER_RUN = 20;

function json(
  body: Record<string, unknown>,
  status: AgentFindResult["status"],
  revalidatePaths?: string[],
): AgentFindResult {
  return { status, body, revalidatePaths };
}

async function finalizeRun(
  insforge: InsforgeServer,
  runId: string,
  args: { status: "completed" | "failed"; jobsFound: number },
): Promise<void> {
  try {
    const { error } = await insforge.database
      .from("agent_runs")
      .update({
        status: args.status,
        jobs_found: args.jobsFound,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    if (error) {
      console.error("[agent/find] run update failed:", error);
    }
  } catch (error) {
    console.error("[agent/find] run update failed:", error);
  }
}

function captureSavedJobEvents(
  captureJobFoundEvent: CaptureJobFoundEventFn,
  userId: string,
  result: DiscoveryResult,
): void {
  void Promise.allSettled(
    result.savedJobs.map((savedJob) =>
      captureJobFoundEvent("job_found", {
        userId,
        source: "search",
        matchScore: savedJob.matchScore,
        sourceProvider: savedJob.sourceProvider,
        sourceDisplayName: savedJob.sourceDisplayName,
      }),
    ),
  ).then((outcomes) => {
    for (const outcome of outcomes) {
      if (outcome.status === "rejected") {
        console.error("[agent/find] job_found analytics failed:", outcome.reason);
      }
    }
  });
}

export async function resolveAgentFindRoute({
  user,
  insforge,
  body,
  discoverJobs = discoverJobsDefault,
  checkQuotaAvailable = checkQuotaAvailableDefault,
  recordUsage = recordUsageDefault,
  captureJobFoundEvent = capturePostHogServerEventDefault,
}: ResolveAgentFindRouteArgs): Promise<AgentFindResult> {
  if (!user) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  if (!insforge) {
    console.error("[agent/find] missing InsForge client for authenticated user.");
    return json({ success: false, error: "Internal server error" }, 500);
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const jobTitle =
    typeof record.jobTitle === "string" ? record.jobTitle.trim() : "";
  const location =
    typeof record.location === "string" ? record.location.trim() : "";

  if (!jobTitle) {
    return json({ success: false, error: "Enter a job title to search." }, 400);
  }

  const { data: profileRow, error: profileError } = await insforge.database
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[agent/find] profile read error:", profileError);
    return json(
      { success: false, error: "Failed to load your profile. Please try again." },
      500,
    );
  }

  const profileData = profileRow as ProfileRow | null;

  if (!profileData || profileData.is_complete !== true) {
    return json(
      { success: false, error: "Complete your profile before searching for jobs." },
      400,
    );
  }

  const profile = mapProfileRowToProfile(profileData, user.email ?? "");

  const { data: runData, error: runError } = await insforge.database
    .from("agent_runs")
    .insert([
      {
        user_id: user.id,
        status: "running",
        job_title_searched: jobTitle,
        location_searched: location || null,
      },
    ])
    .select("id")
    .single();

  const run = runData as { id?: string } | null;

  if (runError || !run?.id) {
    console.error("[agent/find] run insert failed:", runError);
    return json(
      { success: false, error: "Could not start the search. Please try again." },
      500,
    );
  }

  const searchIdempotencyKey = `run:${run.id}:search`;
  let result: DiscoveryResult;

  try {
    const scoreQuota = await checkQuotaAvailable(user.id, "job_match_score", 1);
    const scoreLimit = Math.min(
      MAX_JOBS_TO_SCORE_PER_RUN,
      Math.max(0, scoreQuota.limit - scoreQuota.current),
    );

    if (!scoreQuota.allowed || scoreLimit <= 0) {
      await finalizeRun(insforge, run.id, { status: "failed", jobsFound: 0 });
      return json(
        {
          success: false,
          error: `Quota exceeded for job_match_score. Current usage: ${scoreQuota.current}, Limit: ${scoreQuota.limit} on plan ${scoreQuota.planKey}.`,
          code: "QUOTA_EXCEEDED",
          eventType: "job_match_score",
          current: scoreQuota.current,
          limit: scoreQuota.limit,
          planKey: scoreQuota.planKey,
        },
        402,
      );
    }

    const searchReservation = await recordUsage(
      user.id,
      "job_search_run",
      1,
      searchIdempotencyKey,
      { jobTitle, location },
      "/api/agent/find",
      run.id,
    );

    if (!searchReservation.success) {
      await finalizeRun(insforge, run.id, { status: "failed", jobsFound: 0 });
      if (searchReservation.code === "QUOTA_EXCEEDED") {
        return json(
          {
            success: false,
            error: searchReservation.error,
            code: "QUOTA_EXCEEDED",
            eventType: "job_search_run",
            current: searchReservation.current,
            limit: searchReservation.limit,
            planKey: searchReservation.planKey,
          },
          402,
        );
      }
      return json(
        { success: false, error: "Could not start the search. Please try again." },
        500,
      );
    }

    const discovery = await discoverJobs({
      insforge,
      userId: user.id,
      runId: run.id,
      profile,
      jobTitle,
      location,
      scoreLimit,
    });

    if (!discovery.success) {
      await finalizeRun(insforge, run.id, { status: "failed", jobsFound: 0 });
      return json(
        { success: false, error: "Job search failed. Please try again." },
        500,
      );
    }

    result = discovery.result;
  } catch (error) {
    await finalizeRun(insforge, run.id, { status: "failed", jobsFound: 0 });
    console.error("[agent/find]", error);
    return json({ success: false, error: "Internal server error" }, 500);
  }

  await finalizeRun(insforge, run.id, {
    status: "completed",
    jobsFound: result.saved,
  });

  captureSavedJobEvents(captureJobFoundEvent, user.id, result);

  return json(
    {
      success: true,
      data: {
        found: result.found,
        saved: result.saved,
        strongMatches: result.strongMatches,
        sources: result.sources,
        skippedDuplicates: result.skippedDuplicates,
        skippedForQuota: result.skippedForQuota,
      },
    },
    200,
    ["/find-jobs"],
  );
}
