/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CheckoutResult {
  success: boolean;
  fallback?: boolean;
  url?: string;
  error?: string;
}

export interface PortalResult {
  success: boolean;
  fallback?: boolean;
  url?: string;
  error?: string;
}

export interface WebhookResult {
  received: boolean;
  status: "processed" | "ignored" | "failed";
  duplicate?: boolean;
  error?: string;
}

/**
 * Shared handler for Stripe checkout session creation.
 * Calls InsForge payments client to generate a subscription checkout session URL.
 * Falls back gracefully when payments are disabled.
 * 
 * @param params - Parameters containing userId, userEmail, requestUrl, and insforge client.
 * @returns CheckoutResult object containing success status, fallback indicator, and redirect URL or error message.
 */
export async function handleCheckout({
  userId,
  userEmail,
  requestUrl,
  insforge,
}: {
  userId: string;
  userEmail?: string;
  requestUrl: URL;
  insforge: any;
}): Promise<CheckoutResult> {
  try {
    const stripePriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_pro_test";

    const sessionRequest = {
      mode: "subscription" as const,
      lineItems: [
        {
          stripePriceId,
          quantity: 1,
        },
      ],
      successUrl: `${requestUrl.origin}/dashboard?checkout_success=true`,
      cancelUrl: `${requestUrl.origin}/pricing`,
      subject: {
        type: "user",
        id: userId,
      },
      customerEmail: userEmail || undefined,
    };

    console.log("[billing/checkout] Creating session:", {
      priceId: stripePriceId,
      hasEmail: !!userEmail,
      mode: "subscription",
    });

    const { data, error } = await insforge.payments.createCheckoutSession("test", sessionRequest);

    if (error) {
      console.warn("[billing/checkout] InsForge payments endpoint returned error:", error);
      return {
        success: false,
        fallback: true,
        error: error.message || "Payments are not configured on this backend.",
      };
    }

    if (!data || !data.checkoutSession || !data.checkoutSession.url) {
      console.warn("[billing/checkout] No checkout URL returned by InsForge payments client.");
      return {
        success: false,
        fallback: true,
        error: "Checkout session created, but redirect URL is missing.",
      };
    }

    return {
      success: true,
      url: data.checkoutSession.url,
    };
  } catch (err) {
    console.error("[billing/checkout] Unexpected error:", err);
    return {
      success: false,
      fallback: true,
      error: (err as Error).message || String(err),
    };
  }
}

/**
 * Shared handler for Stripe customer billing portal session creation.
 * Retrieves the user's stripe customer ID and generates a portal session URL.
 * 
 * @param params - Parameters containing userId, requestUrl, and insforge client.
 * @returns PortalResult object containing success status, fallback indicator, and redirect URL or error message.
 */
export async function handlePortal({
  userId,
  requestUrl,
  insforge,
}: {
  userId: string;
  requestUrl: URL;
  insforge: any;
}): Promise<PortalResult> {
  try {
    const { data: entitlement, error: dbError } = await insforge.database
      .from("user_entitlements")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (dbError) {
      console.error("[billing/portal] DB error reading entitlement:", dbError);
      return {
        success: false,
        error: "Database error while verifying customer subscription status.",
      };
    }

    if (!entitlement || !entitlement.stripe_customer_id) {
      return { 
        success: false, 
        error: "No active Stripe customer profile found. Please subscribe to a Pro plan first.",
      };
    }

    const portalRequest = {
      subject: {
        type: "user",
        id: userId,
      },
      returnUrl: `${requestUrl.origin}/profile`,
    };

    console.log("[billing/portal] Creating customer portal session:", portalRequest);

    const { data, error } = await insforge.payments.createCustomerPortalSession("test", portalRequest);

    if (error) {
      console.warn("[billing/portal] InsForge customer portal endpoint returned error:", error);
      return {
        success: false,
        fallback: true,
        error: error.message || "Customer portal is not available on this environment.",
      };
    }

    if (!data || !data.customerPortalSession || !data.customerPortalSession.url) {
      console.warn("[billing/portal] No redirect URL returned by InsForge payments client.");
      return {
        success: false,
        fallback: true,
        error: "Billing portal session created, but redirect URL is missing.",
      };
    }

    return {
      success: true,
      url: data.customerPortalSession.url,
    };
  } catch (err) {
    console.error("[billing/portal] Unexpected error:", err);
    return {
      success: false,
      fallback: true,
      error: (err as Error).message || String(err),
    };
  }
}

/**
 * Shared handler for processing incoming Stripe webhooks.
 * Implements atomic idempotency checks and fulfills subscription checkouts,
 * updates, and cancellations.
 * 
 * @param params - Parameters containing the Stripe event payload and the insforge admin client.
 * @returns WebhookResult object containing status, duplicate flag, and any error message.
 */
export async function handleWebhook({
  event,
  insforgeAdmin,
}: {
  event: any;
  insforgeAdmin: any;
}): Promise<WebhookResult> {
  const stripeEventId = event.id;
  const eventType = event.type;

  if (!stripeEventId || !eventType) {
    return { received: false, status: "failed", error: "Missing event metadata" };
  }

  // 1. Check idempotency atomically
  try {
    // Insert as pending immediately. If it already exists, the database unique key constraint will reject it.
    const { error: insertError } = await insforgeAdmin.database
      .from("billing_webhook_events")
      .insert([
        {
          stripe_event_id: stripeEventId,
          event_type: eventType,
          processed_at: new Date().toISOString(),
          payload: event,
          processing_status: "pending",
        },
      ]);

    if (insertError) {
      const isDuplicate = insertError.code === "23505" || insertError.message?.includes("duplicate key");
      if (isDuplicate) {
        // Retrieve status of the existing event
        const { data: existingEvent, error: selectError } = await insforgeAdmin.database
          .from("billing_webhook_events")
          .select("processing_status")
          .eq("stripe_event_id", stripeEventId)
          .maybeSingle();

        if (selectError) {
          console.error("[billing/webhook] Error checking existing event:", selectError);
          return { received: false, status: "failed", error: "Database error" };
        }

        if (existingEvent) {
          if (existingEvent.processing_status === "processed" || existingEvent.processing_status === "ignored") {
            console.log(`[billing/webhook] Event ${stripeEventId} already processed (race detected), skipping.`);
            return { received: true, status: "ignored", duplicate: true };
          }
          if (existingEvent.processing_status === "pending") {
            console.log(`[billing/webhook] Event ${stripeEventId} is currently being processed by another worker.`);
            return { received: false, status: "failed", error: "Event currently processing" };
          }
        }
      }

      console.error("[billing/webhook] Error inserting pending event:", insertError);
      return { received: false, status: "failed", error: "Database error" };
    }
  } catch (err) {
    console.error("[billing/webhook] Idempotency check failed:", err);
    return { received: false, status: "failed", error: "Server error" };
  }

  // 2. Handle event
  try {
    const dataObject = event.data.object;
    const stripeProPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_pro_test";

    let processed = false;
    let userId: string | null = null;
    let customerId: string | null = dataObject.customer || null;
    let subscriptionId: string | null = dataObject.subscription || dataObject.id || null;

    if (eventType === "checkout.session.completed") {
      userId = dataObject.client_reference_id || dataObject.metadata?.userId || null;
      customerId = dataObject.customer;
      subscriptionId = dataObject.subscription;

      if (userId) {
        const { error: upsertError } = await insforgeAdmin.database
          .from("user_entitlements")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (upsertError) {
          throw new Error(`Failed to associate user entitlement: ${upsertError.message}`);
        }
        console.log(`[billing/webhook] Associated user ${userId} with customer ${customerId}`);
        processed = true;
      } else {
        console.warn(`[billing/webhook] checkout.session.completed missing client_reference_id / userId in metadata`);
      }
    }

    if (
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated"
    ) {
      customerId = dataObject.customer;
      subscriptionId = dataObject.id;
      const status = dataObject.status;
      const cancelAtPeriodEnd = !!dataObject.cancel_at_period_end;
      const currentPeriodStart = dataObject.current_period_start
        ? new Date(dataObject.current_period_start * 1000).toISOString()
        : null;
      const currentPeriodEnd = dataObject.current_period_end
        ? new Date(dataObject.current_period_end * 1000).toISOString()
        : null;

      const priceId = dataObject.items?.data?.[0]?.price?.id || null;

      // Determine tier
      let planKey: "free" | "pro" = "free";
      if (
        priceId === stripeProPriceId &&
        (status === "active" || status === "trialing" || status === "past_due")
      ) {
        planKey = "pro";
      }

      // Try to find the user_id by customer_id or subscription_id
      const { data: entitlementRow } = await insforgeAdmin.database
        .from("user_entitlements")
        .select("user_id")
        .or(`stripe_customer_id.eq.${customerId},stripe_subscription_id.eq.${subscriptionId}`)
        .maybeSingle();

      userId = entitlementRow?.user_id || dataObject.metadata?.userId || null;

      if (userId) {
        const { error: updateError } = await insforgeAdmin.database
          .from("user_entitlements")
          .upsert(
            {
              user_id: userId,
              plan_key: planKey,
              status,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              stripe_price_id: priceId,
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: cancelAtPeriodEnd,
              source: "stripe",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (updateError) {
          throw new Error(`Failed to update entitlement: ${updateError.message}`);
        }
        console.log(`[billing/webhook] Updated user ${userId} entitlement to plan: ${planKey}, status: ${status}`);
        processed = true;
      } else {
        console.warn(`[billing/webhook] Subscription event customer ${customerId} could not be mapped to a user`);
      }
    }

    if (eventType === "customer.subscription.deleted") {
      customerId = dataObject.customer;
      subscriptionId = dataObject.id;

      // Find user
      const { data: entitlementRow } = await insforgeAdmin.database
        .from("user_entitlements")
        .select("user_id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();

      userId = entitlementRow?.user_id;

      if (userId) {
        const { error: updateError } = await insforgeAdmin.database
          .from("user_entitlements")
          .update({
            plan_key: "free",
            status: "canceled",
            cancel_at_period_end: false,
            current_period_start: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateError) {
          throw new Error(`Failed to downgrade entitlement: ${updateError.message}`);
        }
        console.log(`[billing/webhook] Downgraded user ${userId} to Free due to subscription deletion.`);
        processed = true;
      }
    }

    if (eventType === "invoice.paid") {
      customerId = dataObject.customer;
      subscriptionId = dataObject.subscription;

      // Find user
      const { data: entitlementRow } = await insforgeAdmin.database
        .from("user_entitlements")
        .select("user_id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();

      userId = entitlementRow?.user_id;

      if (userId) {
        const { error: updateError } = await insforgeAdmin.database
          .from("user_entitlements")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateError) {
          throw new Error(`Failed to update entitlement status on invoice.paid: ${updateError.message}`);
        }
        console.log(`[billing/webhook] Set user ${userId} entitlement status to active (invoice.paid).`);
        processed = true;
      }
    }

    if (eventType === "invoice.payment_failed") {
      customerId = dataObject.customer;
      subscriptionId = dataObject.subscription;

      // Find user
      const { data: entitlementRow } = await insforgeAdmin.database
        .from("user_entitlements")
        .select("user_id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();

      userId = entitlementRow?.user_id;

      if (userId) {
        const { error: updateError } = await insforgeAdmin.database
          .from("user_entitlements")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateError) {
          throw new Error(`Failed to update entitlement status on invoice.payment_failed: ${updateError.message}`);
        }
        console.log(`[billing/webhook] Set user ${userId} entitlement status to past_due (invoice.payment_failed).`);
        processed = true;
      }
    }

    // 3. Mark processed
    const finalStatus = processed ? "processed" : "ignored";
    const { error: updateEventError } = await insforgeAdmin.database
      .from("billing_webhook_events")
      .update({
        processing_status: finalStatus,
        processed_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", stripeEventId);

    if (updateEventError) {
      console.error("[billing/webhook] Error updating event status:", updateEventError);
    }

    return { received: true, status: finalStatus };
  } catch (err) {
    const errorMsg = (err as Error).message || String(err);
    console.error(`[billing/webhook] Handler failed for event ${stripeEventId}:`, err);

    await insforgeAdmin.database
      .from("billing_webhook_events")
      .update({
        processing_status: "failed",
        error: errorMsg,
        processed_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", stripeEventId);

    return { received: false, status: "failed", error: errorMsg };
  }
}
