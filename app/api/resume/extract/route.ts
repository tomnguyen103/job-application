import crypto from "crypto";
import { NextResponse } from "next/server";

import { extractProfileFromPdf } from "@/agent/extractor";
import { recordUsage, releaseResumeExtractReservation, usageFailureToHttpResult } from "@/lib/billing/usage";
import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";

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
    const { data: blob, error: downloadError } = await insforge.storage
      .from("resumes")
      .download(`${user.id}/resume.pdf`);

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
    const extractReservation = await recordUsage(
      user.id,
      "resume_extract",
      1,
      extractIdempotencyKey,
      { resumeHash: hash, reservationKind: "resume_extract_parse" },
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

    let extracted: Awaited<ReturnType<typeof extractProfileFromPdf>>;
    try {
      extracted = await extractProfileFromPdf(base64);
    } catch (error) {
      const release = await releaseResumeExtractReservation(user.id, extractIdempotencyKey);
      if (!release.success) {
        console.error("[resume/extract] reservation release failed after extractor error:", release.error);
      }
      throw error;
    }

    if (Object.keys(extracted).length === 0) {
      const release = await releaseResumeExtractReservation(user.id, extractIdempotencyKey);
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
