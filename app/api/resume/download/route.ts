import { NextResponse } from "next/server";

import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insforge = await createInsforgeServer();
    const { data: blob, error } = await insforge.storage
      .from("resumes")
      .download(`${user.id}/resume.pdf`);

    if (error || !blob) {
      return NextResponse.json(
        { error: "No resume found. Please upload or generate one first." },
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
    console.error("[resume/download]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}
