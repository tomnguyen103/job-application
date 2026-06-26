import { NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { handleCheckout } from "@/lib/billing/routes";

export async function POST(req: Request) {
  try {
    const insforge = await createInsforgeServer();
    const {
      data: { user },
      error: authError,
    } = await insforge.auth.getCurrentUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const requestUrl = new URL(req.url);

    const result = await handleCheckout({
      userId: user.id,
      userEmail: user.email ?? undefined,
      requestUrl,
      insforge,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[billing/checkout]", err);
    return NextResponse.json({
      success: false,
      fallback: true,
      error: (err as Error).message || String(err),
    });
  }
}
