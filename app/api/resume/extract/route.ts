import crypto from "crypto";
import { NextResponse } from "next/server";

import { extractProfileFromPdf } from "@/agent/extractor";
import { recordUsage, releaseResumeExtractReservation, usageFailureToHttpResult } from "@/lib/billing/usage";
import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";
import {
  usageReservationReleaseToken,
  usageReservationReleaseTokenHash,
} from "@/lib/resume-generation-quota";
import { PROFILE_RESUME_BUCKET, resolveResumeStorageKey } from "@/lib/resume-storage";

export const maxDuration = 60;

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const insforge = await createInsforgeServer();
    const { data: profileRow, error: profileError } = await insforge.database
      .from("profiles")
      .select("resume_pdf_key, resume_pdf_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[resume/extract] profile read error:", profileError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to load your resume. Please try again.",
        },
        { status: 500 },
      );
    }

    if (!profileRow?.resume_pdf_url) {
      return NextResponse.json(
        {
          success: false,
          error: "No resume found. Please upload your resume first.",
        },
        { status: 404 },
      );
    }

    const storageKey = resolveResumeStorageKey(user.id, profileRow.resume_pdf_key);
    const { data: blob, error: downloadError } = await insforge.storage
      .from(PROFILE_RESUME_BUCKET)
      .download(storageKey);

    if (downloadError) {
      console.error("[resume/extract] storage download error:", downloadError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to download your resume. Please try again.",
        },
        { status: 500 },
      );
    }

    if (!blob) {
      return NextResponse.json(
        {
          success: false,
          error: "No resume found. Please upload your resume first.",
        },
        { status: 404 },
      );
    }

    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    const hash = crypto.createHash("sha256").update(base64).digest("hex");
    const extractIdempotencyKey = `extract:${crypto.randomUUID()}`;
    const extractReleaseToken = usageReservationReleaseToken();
    const extractReservation = await recordUsage(
      user.id,
      "resume_extract",
      1,
      extractIdempotencyKey,
      {
        resumeHash: hash,
        reservationKind: "resume_extract_parse",
        releaseTokenHash: usageReservationReleaseTokenHash(extractReleaseToken),
      },
      "/api/resume/extract",
    );

    if (!extractReservation.success) {
      const failure = usageFailureToHttpResult(
        "resume_extract",
        extractReservation,
        "Could not finish resume extraction. Please try again.",
      );
      return NextResponse.json(failure.body, { status: failure.status });
    }
    if (extractReservation.idempotent) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This extraction request has already been received. Please refresh or start a new request.",
        },
        { status: 409 },
      );
    }

    let extracted: Awaited<ReturnType<typeof extractProfileFromPdf>>;
    try {
      extracted = await extractProfileFromPdf(base64);
    } catch (error) {
      const release = await releaseResumeExtractReservation(
        user.id,
        extractIdempotencyKey,
        extractReleaseToken,
      );
      if (!release.success) {
        console.error("[resume/extract] reservation release failed after extractor error:", release.error);
      }
      throw error;
    }

    if (Object.keys(extracted).length === 0) {
      const release = await releaseResumeExtractReservation(
        user.id,
        extractIdempotencyKey,
        extractReleaseToken,
      );
      if (!release.success) {
        console.error("[resume/extract] reservation release failed after empty extraction:", release.error);
        return NextResponse.json(
          {
            success: false,
            error: "Could not finish resume extraction. Please try again.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: "No profile data could be read from this resume PDF.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ success: true, data: extracted });
  } catch (error) {
    console.error("[resume/extract]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
