import { NextResponse } from "next/server";

import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";
import {
  safeTailoredResumeFileName,
  TAILORED_RESUME_BUCKET,
} from "@/lib/tailored-resume";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type TailoredResumeDownloadRow = {
  id: string;
  storage_key: string;
  file_name: string | null;
  generated_at: string;
  expires_at: string;
};

export async function GET(_request: Request, { params }: RouteContext) {
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

    const { data: jobRow, error: jobError } = await insforge.database
      .from("jobs")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (jobError) {
      console.error("[tailored-resume/download] job read error:", jobError);
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

    const { data: resumeRow, error: resumeError } = await insforge.database
      .from("tailored_resumes")
      .select("id, storage_key, file_name, generated_at, expires_at")
      .eq("user_id", user.id)
      .eq("job_id", id)
      .gt("expires_at", new Date().toISOString())
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resumeError) {
      console.error(
        "[tailored-resume/download] metadata read error:",
        resumeError,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Failed to load the tailored resume. Please try again.",
        },
        { status: 500 },
      );
    }

    if (!resumeRow) {
      return NextResponse.json(
        {
          success: false,
          error: "No unexpired tailored resume found.",
        },
        { status: 404 },
      );
    }

    const row = resumeRow as TailoredResumeDownloadRow;
    const { data: blob, error: downloadError } = await insforge.storage
      .from(TAILORED_RESUME_BUCKET)
      .download(row.storage_key);

    if (downloadError || !blob) {
      console.error(
        "[tailored-resume/download] storage download error:",
        downloadError,
      );
      return NextResponse.json(
        {
          success: false,
          error: "No unexpired tailored resume found.",
        },
        { status: 404 },
      );
    }

    const fileName = safeTailoredResumeFileName(row.file_name);

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[tailored-resume/download]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
