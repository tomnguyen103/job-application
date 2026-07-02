import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { resolveAgentFindRoute } from "@/lib/agent-find-route";
import { createInsforgeServer, getCurrentUser } from "@/lib/insforge-server";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      const result = await resolveAgentFindRoute({
        user,
        insforge: null,
        body: null,
      });
      return NextResponse.json(result.body, { status: result.status });
    }

    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const insforge = await createInsforgeServer();
    const result = await resolveAgentFindRoute({ user, insforge, body });

    for (const path of result.revalidatePaths ?? []) {
      revalidatePath(path);
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("[agent/find]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
