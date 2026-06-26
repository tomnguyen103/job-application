/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createInsforgeAdmin } from "@/lib/insforge-server";
import { handleWebhook } from "@/lib/billing/routes";

export async function POST(req: Request) {
  let event: any;
  try {
    event = await req.json();
  } catch (err) {
    console.error("[billing/webhook] Failed to parse JSON body:", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const insforgeAdmin = createInsforgeAdmin();
    const result = await handleWebhook({
      event,
      insforgeAdmin,
    });

    if (result.error === "Missing event metadata") {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (!result.received && result.status === "failed") {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[billing/webhook] Webhook endpoint handler crashed:", err);
    return NextResponse.json({ error: (err as Error).message || String(err) }, { status: 500 });
  }
}
