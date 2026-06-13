import { NextResponse } from "next/server";

import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";
import {
  resolveTailoredResumeDownload,
  type TailoredResumeDownloadClient,
} from "@/lib/tailored-resume-download";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const insforge = await createInsforgeServer();

    const result = await resolveTailoredResumeDownload({
      user,
      jobId: id,
      // InsForge's selected query builder gains filter methods after select();
      // this route helper narrows to only that chain for focused unit tests.
      insforge: insforge as unknown as TailoredResumeDownloadClient,
    });

    if (result.status !== 200) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return new NextResponse(result.blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.fileName}"`,
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
