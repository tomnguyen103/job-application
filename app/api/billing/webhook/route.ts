/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createInsforgeAdmin } from "@/lib/insforge-server";
import { handleWebhook } from "@/lib/billing/routes";
import { verifyStripeSignature } from "@/lib/billing/verify-webhook-signature";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[billing/webhook] STRIPE_WEBHOOK_SECRET is not configured — refusing to process webhook.");
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 500 });
  }

  const verification = verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
  if (!verification.valid) {
    console.error("[billing/webhook] Signature verification failed:", verification.error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
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
