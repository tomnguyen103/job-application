import { randomUUID } from "node:crypto";

import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  generateTailoredResumeContent,
  type TailoredResumeJob,
} from "@/agent/tailored-resume";
import { recordUsage, usageFailureToHttpResult } from "@/lib/billing/usage";
import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";
import {
  buildTailoredResumeStorageKey,
  getTailoredResumeExpiresAt,
  previousTailoredResumeMetadataIdsToDelete,
  TAILORED_RESUME_BUCKET,
  TAILORED_RESUME_FILE_NAME,
} from "@/lib/tailored-resume";
import { mapProfileRowToProfile } from "@/lib/utils";
import type { ProfileRow } from "@/types";

import { buildTailoredResumeDocument } from "./TailoredResumeDocument";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type TailoredResumeJobRow = {
  id: string;
  title: string | null;
  company: string | null;
  about_role: string | null;
  responsibilities: string[] | null;
  requirements: string[] | null;
  nice_to_have: string[] | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
};

type PreviousTailoredResumeRow = {
  id: string;
  storage_key: string | null;
};

type RemovableStorageBucket = {
  remove(path: string): Promise<{ error: unknown }>;
};

function cleanText(value: string | null | undefined, fallback = ""): string {
  const text = value?.trim();
  return text ? text : fallback;
}

function cleanList(value: string[] | null | undefined): string[] {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function mapJobRowToTailoredResumeJob(
  row: TailoredResumeJobRow,
): TailoredResumeJob {
  return {
    id: row.id,
    title: cleanText(row.title, "Untitled role"),
    company: cleanText(row.company, "Unknown company"),
    aboutRole: cleanText(row.about_role),
    responsibilities: cleanList(row.responsibilities),
    requirements: cleanList(row.requirements),
    niceToHave: cleanList(row.nice_to_have),
    matchedSkills: cleanList(row.matched_skills),
    missingSkills: cleanList(row.missing_skills),
  };
}

function tailoredResumeDownloadUrl(jobId: string): string {
  return `/api/jobs/${jobId}/tailored-resume/download`;
}

async function removeTailoredResumeFile(
  bucket: RemovableStorageBucket,
  key: string,
): Promise<{ error: unknown }> {
  return bucket.remove(key);
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Job not found." },
        { status: 404 },
      );
    }

    const insforge = await createInsforgeServer();

    const { data: profileRow, error: profileError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[tailored-resume] profile read error:", profileError);
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
          error: "Complete your profile before generating a tailored resume.",
        },
        { status: 400 },
      );
    }

    const { data: jobRow, error: jobError } = await insforge.database
      .from("jobs")
      .select(
        "id, title, company, about_role, responsibilities, requirements, nice_to_have, matched_skills, missing_skills",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (jobError) {
      console.error("[tailored-resume] job read error:", jobError);
      return NextResponse.json(
        { success: false, error: "Failed to load this job. Please try again." },
        { status: 500 },
      );
    }

    if (!jobRow) {
      return NextResponse.json(
        { success: false, error: "Job not found." },
        { status: 404 },
      );
    }

    const { data: previousRows, error: previousError } =
      await insforge.database
        .from("tailored_resumes")
        .select("id, storage_key")
        .eq("user_id", user.id)
        .eq("job_id", id);

    if (previousError) {
      console.error(
        "[tailored-resume] previous resume read error:",
        previousError,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Failed to prepare this tailored resume. Please try again.",
        },
        { status: 500 },
      );
    }

    const profile = mapProfileRowToProfile(profileRow as ProfileRow, user.email ?? "");
    const job = mapJobRowToTailoredResumeJob(jobRow as TailoredResumeJobRow);
    const generatedAt = new Date();
    const expiresAt = getTailoredResumeExpiresAt(generatedAt);
    const resumeId = randomUUID();
    const storageKey = buildTailoredResumeStorageKey(user.id, job.id, resumeId);
    const bucket = insforge.storage.from(TAILORED_RESUME_BUCKET);

    const tailorReservation = await recordUsage(
      user.id,
      "tailored_resume_generate",
      1,
      `tailor:${resumeId}`,
      { jobId: job.id, company: job.company },
      `/api/jobs/${job.id}/tailored-resume`,
      resumeId,
    );

    if (!tailorReservation.success) {
      const failure = usageFailureToHttpResult(
        "tailored_resume_generate",
        tailorReservation,
        "Could not start tailored resume generation. Please try again.",
      );
      return NextResponse.json(failure.body, { status: failure.status });
    }

    let content;
    try {
      content = await generateTailoredResumeContent({ profile, job });
    } catch (error) {
      console.error("[tailored-resume] content generation failed:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Could not generate tailored resume content. Please try again.",
        },
        { status: 422 },
      );
    }

    let uploadedKey = storageKey;

    try {
      const buffer = await renderToBuffer(
        buildTailoredResumeDocument({ profile, content, job }),
      );
      const file = new File([new Uint8Array(buffer)], TAILORED_RESUME_FILE_NAME, {
        type: "application/pdf",
      });

      const { data: uploadData, error: uploadError } = await bucket.upload(
        storageKey,
        file,
      );

      if (uploadError || !uploadData) {
        console.error("[tailored-resume] upload error:", uploadError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to save the tailored resume. Please try again.",
          },
          { status: 500 },
        );
      }

      uploadedKey = uploadData.key ?? storageKey;
      const downloadUrl = tailoredResumeDownloadUrl(job.id);

      const { error: insertError } = await insforge.database
        .from("tailored_resumes")
        .insert([
          {
            id: resumeId,
            user_id: user.id,
            job_id: job.id,
            storage_key: uploadedKey,
            storage_url: downloadUrl,
            file_name: TAILORED_RESUME_FILE_NAME,
            generated_at: generatedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error("[tailored-resume] metadata insert error:", insertError);
        await removeTailoredResumeFile(bucket, uploadedKey);
        return NextResponse.json(
          {
            success: false,
            error:
              "Resume was generated but the reference failed to save. Please try again.",
          },
          { status: 500 },
        );
      }

      const previous = (previousRows ?? []) as PreviousTailoredResumeRow[];
      const removedStorageKeys = new Set<string>();

      for (const row of previous) {
        if (row.storage_key && row.id !== resumeId) {
          const { error: removeError } = await removeTailoredResumeFile(
            bucket,
            row.storage_key,
          );
          if (removeError) {
            console.warn(
              "[tailored-resume] previous file cleanup warning:",
              removeError,
            );
          } else {
            removedStorageKeys.add(row.storage_key);
          }
        }
      }

      const previousIds = previousTailoredResumeMetadataIdsToDelete(previous, {
        currentResumeId: resumeId,
        removedStorageKeys,
      });

      if (previousIds.length > 0) {
        const { error: deleteError } = await insforge.database
          .from("tailored_resumes")
          .delete()
          .eq("user_id", user.id)
          .eq("job_id", job.id)
          .in("id", previousIds);

        if (deleteError) {
          console.warn(
            "[tailored-resume] previous metadata cleanup warning:",
            deleteError,
          );
        }
      }

      revalidatePath(`/find-jobs/${job.id}`);

      return NextResponse.json({
        success: true,
        data: {
          resumeId,
          downloadUrl,
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("[tailored-resume]", error);
      await removeTailoredResumeFile(bucket, uploadedKey);
      return NextResponse.json(
        {
          success: false,
          error: "An unexpected error occurred. Please try again.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[tailored-resume]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
