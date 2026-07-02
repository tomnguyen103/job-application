import { NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { handlePortal } from "@/lib/billing/routes";
import type { BillingPortalClient } from "@/lib/billing/routes";

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

    const result = await handlePortal({
      userId: user.id,
      requestUrl,
      insforge: insforge as unknown as BillingPortalClient,
    });

    if (!result.success && result.error?.includes("Stripe customer")) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[billing/portal]", err);
    return NextResponse.json(
      {
        success: false,
        fallback: true,
        error: "Could not open the billing portal. Please try again.",
      },
      { status: 500 },
    );
  }
}
