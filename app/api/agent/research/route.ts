import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { researchCompany } from "@/agent/research";
import type { CompanyResearchJob } from "@/agent/research";
import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";
import { capturePostHogServerEvent } from "@/lib/posthog-server";
import { mapProfileRowToProfile } from "@/lib/utils";
import type { ProfileRow } from "@/types";

export const runtime = "nodejs";

type JobResearchRow = {
  id: string;
  title: string | null;
  company: string | null;
  source_url: string | null;
  external_apply_url: string | null;
  about_role: string | null;
  responsibilities: string[] | null;
  requirements: string[] | null;
  nice_to_have: string[] | null;
  benefits: string[] | null;
  about_company: string | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
};

function cleanText(value: string | null | undefined, fallback = ""): string {
  const text = value?.trim();
  return text ? text : fallback;
}

function cleanList(value: string[] | null | undefined): string[] {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function sectionText(label: string, items: string[]): string | null {
  return items.length > 0 ? `${label}: ${items.join("; ")}` : null;
}

function buildJobDescription(row: JobResearchRow): string {
  return [
    cleanText(row.about_role),
    cleanText(row.about_company),
    sectionText("Responsibilities", cleanList(row.responsibilities)),
    sectionText("Requirements", cleanList(row.requirements)),
    sectionText("Nice to have", cleanList(row.nice_to_have)),
    sectionText("Benefits", cleanList(row.benefits)),
  ]
    .filter((item): item is string => Boolean(item))
    .join("\n\n");
}

function mapJobRowToResearchJob(row: JobResearchRow): CompanyResearchJob {
  return {
    id: row.id,
    title: cleanText(row.title, "Untitled role"),
    company: cleanText(row.company, "Unknown company"),
    postUrl: row.external_apply_url ?? row.source_url,
    description: buildJobDescription(row),
    matchedSkills: cleanList(row.matched_skills),
    missingSkills: cleanList(row.missing_skills),
  };
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
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body." },
        { status: 400 },
      );
    }

    const record =
      body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : {};
    const jobId = typeof record.jobId === "string" ? record.jobId.trim() : "";

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Choose a job to research." },
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
      console.error("[agent/research] profile read error:", profileError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to load your profile. Please try again.",
        },
        { status: 500 },
      );
    }

    if (!profileRow || profileRow.is_complete !== true) {
      return NextResponse.json(
        {
          success: false,
          error: "Complete your profile before researching companies.",
        },
        { status: 400 },
      );
    }

    const { data: jobData, error: jobError } = await insforge.database
      .from("jobs")
      .select(
        "id, title, company, source_url, external_apply_url, about_role, responsibilities, requirements, nice_to_have, benefits, about_company, matched_skills, missing_skills",
      )
      .eq("id", jobId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (jobError) {
      console.error("[agent/research] job read error:", jobError);
      return NextResponse.json(
        { success: false, error: "Failed to load this job. Please try again." },
        { status: 500 },
      );
    }

    if (!jobData) {
      return NextResponse.json(
        { success: false, error: "Job not found." },
        { status: 404 },
      );
    }

    // Boundary assertions on InsForge row shapes: selected columns define this route.
    const profile = mapProfileRowToProfile(profileRow as ProfileRow, user.email ?? "");
    const job = mapJobRowToResearchJob(jobData as JobResearchRow);

    const research = await researchCompany({
      insforge,
      userId: user.id,
      job,
      profile,
    });

    const { error: updateError } = await insforge.database
      .from("jobs")
      .update({
        company_research: research.dossier,
        researched_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[agent/research] research save error:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Could not save company research. Please try again.",
        },
        { status: 500 },
      );
    }

    await capturePostHogServerEvent("company_researched", {
      userId: user.id,
      jobId: job.id,
      company: job.company,
    });

    revalidatePath(`/find-jobs/${job.id}`);
    revalidatePath("/find-jobs");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      data: { dossier: research.dossier },
    });
  } catch (error) {
    console.error("[agent/research]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
