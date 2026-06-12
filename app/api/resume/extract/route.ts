import { NextResponse } from "next/server";

import { extractProfileFromPdf } from "@/agent/extractor";
import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const insforge = await createInsforgeServer();
  const { data: blob, error: downloadError } = await insforge.storage
    .from("resumes")
    .download(`${user.id}/resume.pdf`);

  if (downloadError || !blob) {
    return NextResponse.json(
      { error: "No resume found. Please upload your resume first." },
      { status: 404 },
    );
  }

  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

  try {
    const extracted = await extractProfileFromPdf(base64);
    console.log("[resume/extract] extracted fields:", Object.keys(extracted));
    if (Object.keys(extracted).length === 0) {
      return NextResponse.json(
        { error: "No profile data could be read from this resume PDF." },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: extracted });
  } catch (error) {
    console.error("[resume/extract]", error);
    return NextResponse.json(
      { error: "Could not extract data from this PDF. Please try again." },
      { status: 422 },
    );
  }
}
