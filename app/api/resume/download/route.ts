import { NextResponse } from "next/server";

import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";
import { PROFILE_RESUME_BUCKET, resolveResumeStorageKey } from "@/lib/resume-storage";

export async function GET() {
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
      console.error("[resume/download] profile read error:", profileError);
      return NextResponse.json(
        { success: false, error: "Failed to load your resume. Please try again." },
        { status: 500 },
      );
    }

    if (!profileRow?.resume_pdf_url) {
      return NextResponse.json(
        { success: false, error: "No resume found. Please upload or generate one first." },
        { status: 404 },
      );
    }

    const storageKey = resolveResumeStorageKey(user.id, profileRow.resume_pdf_key);
    const { data: blob, error } = await insforge.storage
      .from(PROFILE_RESUME_BUCKET)
      .download(storageKey);

    if (error || !blob) {
      return NextResponse.json(
        { success: false, error: "No resume found. Please upload or generate one first." },
        { status: 404 },
      );
    }

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="resume.pdf"',
        // The file changes on re-upload/regenerate — never serve a stale copy.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error(
      "[resume/download]",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}
