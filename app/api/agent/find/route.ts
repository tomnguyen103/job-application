import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { discoverJobs } from "@/agent/job-discovery";
import type { DiscoveryResult } from "@/agent/types";
import {
  checkQuotaAvailable,
  recordUsage,
} from "@/lib/billing/usage";
import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";
import { capturePostHogServerEvent } from "@/lib/posthog-server";
import { mapProfileRowToProfile } from "@/lib/utils";

type InsforgeServer = Awaited<ReturnType<typeof createInsforgeServer>>;

const MAX_JOBS_TO_SCORE_PER_RUN = 20;

async function finalizeRun(
  insforge: InsforgeServer,
  runId: string,
  args: { status: "completed" | "failed"; jobsFound: number },
): Promise<void> {
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
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const record =
      body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : {};
    const jobTitle =
      typeof record.jobTitle === "string" ? record.jobTitle.trim() : "";
    const location =
      typeof record.location === "string" ? record.location.trim() : "";

    if (!jobTitle) {
      return NextResponse.json(
        { success: false, error: "Enter a job title to search." },
        { status: 400 },
      );
    }

    const insforge = await createInsforgeServer();

    const { data: profileRow, error: profileError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[agent/find] profile read error:", profileError);
      return NextResponse.json(
        { success: false, error: "Failed to load your profile. Please try again." },
        { status: 500 },
      );
    }

    if (!profileRow || profileRow.is_complete !== true) {
      return NextResponse.json(
        { success: false, error: "Complete your profile before searching for jobs." },
        { status: 400 },
      );
    }

    const profile = mapProfileRowToProfile(profileRow, user.email ?? "");

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

    // Boundary assertion on the SDK row shape — only `id` was selected.
    const run = runData as { id?: string } | null;

    if (runError || !run?.id) {
      console.error("[agent/find] run insert failed:", runError);
      return NextResponse.json(
        { success: false, error: "Could not start the search. Please try again." },
        { status: 500 },
      );
    }

    // Reserve quota atomically before expensive work. Search runs are recorded
    // once the run starts; job_match_score usage is recorded one job at a time
    // inside discoverJobs immediately before each Gemini scoring call.
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
        return NextResponse.json(
          {
            success: false,
            error: `Quota exceeded for job_match_score. Current usage: ${scoreQuota.current}, Limit: ${scoreQuota.limit} on plan ${scoreQuota.planKey}.`,
            code: "QUOTA_EXCEEDED",
            eventType: "job_match_score",
            current: scoreQuota.current,
            limit: scoreQuota.limit,
            planKey: scoreQuota.planKey,
          },
          { status: 402 },
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
          return NextResponse.json(
            {
              success: false,
              error: searchReservation.error,
              code: "QUOTA_EXCEEDED",
              eventType: "job_search_run",
              current: searchReservation.current,
              limit: searchReservation.limit,
              planKey: searchReservation.planKey,
            },
            { status: 402 },
          );
        }
        return NextResponse.json(
          { success: false, error: "Could not start the search. Please try again." },
          { status: 500 },
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
        return NextResponse.json(
          { success: false, error: "Job search failed. Please try again." },
          { status: 500 },
        );
      }

      result = discovery.result;
    } catch (innerError) {
      await finalizeRun(insforge, run.id, { status: "failed", jobsFound: 0 });
      throw innerError;
    }

    await finalizeRun(insforge, run.id, {
      status: "completed",
      jobsFound: result.saved,
    });

    await Promise.all(
      result.savedJobs.map((savedJob) =>
        capturePostHogServerEvent("job_found", {
          userId: user.id,
          source: "search",
          matchScore: savedJob.matchScore,
          sourceProvider: savedJob.sourceProvider,
          sourceDisplayName: savedJob.sourceDisplayName,
        }),
      ),
    );

    revalidatePath("/find-jobs");

    return NextResponse.json({
      success: true,
      data: {
        found: result.found,
        saved: result.saved,
        strongMatches: result.strongMatches,
        sources: result.sources,
        skippedDuplicates: result.skippedDuplicates,
        skippedForQuota: result.skippedForQuota,
      },
    });
  } catch (error) {
    console.error("[agent/find]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
