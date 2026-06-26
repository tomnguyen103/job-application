import crypto from "crypto";
import { NextResponse } from "next/server";

import { extractProfileFromPdf } from "@/agent/extractor";
import { assertQuotaAvailable, recordUsage, QuotaExceededError } from "@/lib/billing/usage";
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

    // Phase 6S.2 - Quota check
    try {
      await assertQuotaAvailable(user.id, "resume_extract", 1);
    } catch (quotaError) {
      if (quotaError instanceof QuotaExceededError) {
        return NextResponse.json(
          {
            success: false,
            error: quotaError.message,
            code: "QUOTA_EXCEEDED",
            eventType: quotaError.eventType,
            current: quotaError.current,
            limit: quotaError.limit,
            planKey: quotaError.planKey,
          },
          { status: 402 },
        );
      }
      throw quotaError;
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
    const extracted = await extractProfileFromPdf(base64);

    if (Object.keys(extracted).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No profile data could be read from this resume PDF.",
        },
        { status: 422 },
      );
    }

    // Phase 6S.2 - Record usage
    const hash = crypto.createHash("sha256").update(base64).digest("hex");
    await recordUsage(
      user.id,
      "resume_extract",
      1,
      `extract:${hash}`,
      {},
      "/api/resume/extract",
    );

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
