import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { generateResumeContent } from "@/agent/generator";
import { recordUsage, usageFailureToHttpResult } from "@/lib/billing/usage";
import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";
import { mapProfileRowToProfile } from "@/lib/utils";

import { buildResumeDocument } from "./ResumeDocument";

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

    const profileUpdatedAt =
      typeof row.updated_at === "string" ? row.updated_at : user.id;
    const generationReservation = await recordUsage(
      user.id,
      "base_resume_generate",
      1,
      `generate:${profileUpdatedAt}`,
      {},
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

    let content;
    try {
      content = await generateResumeContent(profile);
    } catch (error) {
      console.error("[resume/generate] content generation failed:", error);
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

    const path = `${user.id}/resume.pdf`;

    // Remove existing file first; ignore not-found errors
    await insforge.storage.from("resumes").remove(path);

    const { data: uploadData, error: uploadError } = await insforge.storage
      .from("resumes")
      .upload(path, file);

    if (uploadError) {
      console.error("[resume/generate] upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to save the generated resume. Please try again." },
        { status: 500 },
      );
    }

    const url = insforge.storage.from("resumes").getPublicUrl(path);

    const { error: dbError } = await insforge.database
      .from("profiles")
      .upsert(
        {
          id: user.id,
          resume_pdf_url: url,
          resume_pdf_key: uploadData?.key ?? path,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (dbError) {
      console.error("[resume/generate] DB error:", dbError);
      return NextResponse.json(
        {
          success: false,
          error:
            "Resume was generated but the reference failed to save. Please try again.",
        },
        { status: 500 },
      );
    }

    revalidatePath("/profile");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[resume/generate]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}
