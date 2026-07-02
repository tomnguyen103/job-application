import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { generateResumeContent } from "@/agent/generator";
import {
  recordUsage,
  releaseBaseResumeGenerationReservation,
  usageFailureToHttpResult,
} from "@/lib/billing/usage";
import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";
import {
  baseResumeGenerationReleaseToken,
  baseResumeGenerationReleaseTokenHash,
  baseResumeGenerationUsageKey,
} from "@/lib/resume-generation-quota";
import {
  buildResumeStorageKey,
  PROFILE_RESUME_BUCKET,
  replaceResumeReferenceIfCurrent,
  resolveResumeStorageKey,
} from "@/lib/resume-storage";
import { removeExistingResumeFile } from "@/lib/storage-errors";
import { mapProfileRowToProfile } from "@/lib/utils";

import { buildResumeDocument } from "./ResumeDocument";

export const maxDuration = 60;

async function releaseBaseGenerationReservationWithLog(
  userId: string,
  idempotencyKey: string,
  releaseToken: string,
  context: string,
): Promise<void> {
  const release = await releaseBaseResumeGenerationReservation(
    userId,
    idempotencyKey,
    releaseToken,
  );
  if (!release.success) {
    console.error(context, release.error);
  }
}

export async function POST(request: Request) {
  let generationUsageKey: string | null = null;
  let generationReleaseToken: string | null = null;
  let reservedUserId: string | null = null;
  let shouldReleaseGenerationReservation = false;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const insforge = await createInsforgeServer();

    const { data: row, error: profileError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[resume/generate] profile read error:", profileError);
      return NextResponse.json(
        { success: false, error: "Failed to load your profile. Please try again." },
        { status: 500 },
      );
    }

    if (!row || row.is_complete !== true) {
      return NextResponse.json(
        { success: false, error: "Complete your profile before generating a resume." },
        { status: 400 },
      );
    }

    const profile = mapProfileRowToProfile(row, user.email ?? "");
    generationUsageKey = baseResumeGenerationUsageKey(
      request.headers.get("Idempotency-Key"),
    );
    generationReleaseToken = baseResumeGenerationReleaseToken();
    reservedUserId = user.id;

    const generationReservation = await recordUsage(
      user.id,
      "base_resume_generate",
      1,
      generationUsageKey,
      {
        reservationKind: "base_resume_generate",
        releaseTokenHash:
          baseResumeGenerationReleaseTokenHash(generationReleaseToken),
      },
      "/api/resume/generate",
    );

    if (!generationReservation.success) {
      const failure = usageFailureToHttpResult(
        "base_resume_generate",
        generationReservation,
        "Could not start resume generation. Please try again.",
      );
      return NextResponse.json(failure.body, { status: failure.status });
    }
    if (generationReservation.idempotent) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This generation request has already been received. Please refresh or start a new request.",
        },
        { status: 409 },
      );
    }
    shouldReleaseGenerationReservation = true;

    let content;
    try {
      content = await generateResumeContent(profile);
    } catch (error) {
      console.error("[resume/generate] content generation failed:", error);
      if (shouldReleaseGenerationReservation) {
        await releaseBaseGenerationReservationWithLog(
          user.id,
          generationUsageKey,
          generationReleaseToken,
          "[resume/generate] reservation release failed after content generation error:",
        );
      }
      return NextResponse.json(
        { success: false, error: "Could not generate resume content. Please try again." },
        { status: 422 },
      );
    }

    const buffer = await renderToBuffer(
      buildResumeDocument({ profile, content }),
    );
    const file = new File([new Uint8Array(buffer)], "resume.pdf", {
      type: "application/pdf",
    });

    const previousPath = row.resume_pdf_url
      ? resolveResumeStorageKey(user.id, row.resume_pdf_key)
      : null;
    const path = buildResumeStorageKey(user.id);

    const { data: uploadData, error: uploadError } = await insforge.storage
      .from(PROFILE_RESUME_BUCKET)
      .upload(path, file);

    if (uploadError) {
      console.error("[resume/generate] upload error:", uploadError);
      if (shouldReleaseGenerationReservation) {
        await releaseBaseGenerationReservationWithLog(
          user.id,
          generationUsageKey,
          generationReleaseToken,
          "[resume/generate] reservation release failed after upload error:",
        );
      }
      return NextResponse.json(
        { success: false, error: "Failed to save the generated resume. Please try again." },
        { status: 500 },
      );
    }

    const uploadedPath = uploadData?.key ?? path;
    const url = insforge.storage.from(PROFILE_RESUME_BUCKET).getPublicUrl(uploadedPath);

    const saveResult = await replaceResumeReferenceIfCurrent(insforge, {
      userId: user.id,
      profileExists: true,
      currentResumePdfKey: row.resume_pdf_key,
      nextResumePdfKey: uploadedPath,
      nextResumePdfUrl: url,
    });

    if (saveResult.status !== "saved") {
      if (saveResult.status === "error") {
        console.error("[resume/generate] DB error:", saveResult.error);
      }
      if (shouldReleaseGenerationReservation) {
        await releaseBaseGenerationReservationWithLog(
          user.id,
          generationUsageKey,
          generationReleaseToken,
          "[resume/generate] reservation release failed after profile save error:",
        );
      }
      await removeExistingResumeFile(
        insforge,
        uploadedPath,
        saveResult.status === "stale"
          ? "[resume/generate] stale upload cleanup"
          : "[resume/generate] uploaded file cleanup after profile save error",
      );

      if (saveResult.status === "stale") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your profile changed while the resume was generated. Please try again.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "Resume was generated but the reference failed to save. Please try again.",
        },
        { status: 500 },
      );
    }

    shouldReleaseGenerationReservation = false;
    if (previousPath && previousPath !== uploadedPath) {
      await removeExistingResumeFile(
        insforge,
        previousPath,
        "[resume/generate] previous file cleanup",
      );
    }
    revalidatePath("/profile");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[resume/generate]", error);
    if (
      shouldReleaseGenerationReservation &&
      reservedUserId &&
      generationUsageKey &&
      generationReleaseToken
    ) {
      await releaseBaseGenerationReservationWithLog(
        reservedUserId,
        generationUsageKey,
        generationReleaseToken,
        "[resume/generate] reservation release failed after unexpected error:",
      );
    }
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}
