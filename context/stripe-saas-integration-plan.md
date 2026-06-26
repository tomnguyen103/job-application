# Stripe SaaS Integration Plan

## Status

Review draft created 2026-06-14.

This is a separate SaaS plan that extends the future Website Modernization
Phase 6 work. It is not implementation approval. Do not add checkout,
subscriptions, billing portals, pricing UI, admin controls, team billing, or
plan-management code until this plan is reviewed and the implementation gates
below are satisfied.

The current linked InsForge backend still reports:

```json
{
  "error": "Payments are not available on this backend.\nSelf-hosted: upgrade your InsForge instance. Cloud/private preview: contact your InsForge admin to enable payments."
}
```

## What We Are Building

Add a Stripe-backed single-user SaaS layer for JobApplication so a developer
can start on a free tier, upgrade to a paid Pro tier, view their current plan,
track usage against quotas, open a hosted billing portal, and have access
granted or revoked from webhook-backed subscription state.

The first implementation should be conservative: one paid plan, individual
user billing only, usage tracking for expensive operations, and hosted Stripe
surfaces for checkout and subscription management. Teams, organizations,
admin dashboards, multi-seat billing, custom invoices, coupons, trials, and
usage overages stay out of scope unless separately approved.

## Language To Confirm

- **SaaS integration** means pricing, paid subscription checkout, billing
  portal, subscription status, user entitlements, and usage limits. It does
  not mean team accounts or admin controls.
- **Billing subject** means the app entity that owns a subscription. This plan
  treats the billing subject as one authenticated `auth.users(id)` user.
- **Entitlement** means app-owned access state derived from Stripe webhooks,
  not from a checkout success redirect.
- **Usage ledger** means append-only app records for quota-counted actions,
  such as job matching, company research, resume generation, and tailored
  resume generation.
- **Quota** means the monthly limit the app enforces before running expensive
  work.

## Decisions Proposed For Review

### Provider

Use Stripe for SaaS billing.

Preferred integration path:

1. Enable InsForge payments for the linked backend.
2. Use the installed InsForge payments SDK surface:
   `insforge.payments.createCheckoutSession("test", request)` and
   `insforge.payments.createCustomerPortalSession("test", request)`.
3. Keep Stripe secret-key handling inside InsForge payments rather than adding
   direct Stripe secret storage to this app.

Fallback path:

- A direct Stripe SDK integration may be planned only if explicitly approved
  after confirming InsForge payments cannot be enabled soon. That fallback
  requires updating `context/library-docs.md`, adding server-only Stripe env
  variables, and adding a signed webhook route. Do not treat this as the
  default path.

### Initial Plans

Launch with two tiers only:

| Plan | Billing | Purpose |
| --- | --- | --- |
| Free | No Stripe subscription | Let users experience the product with controlled cost. |
| Pro | Monthly subscription | Unlock enough monthly usage for an active job search. |

Recommended review pricing:

| Plan | Price | Notes |
| --- | --- | --- |
| Free | $0 | No card required. |
| Pro | $9/month | Low-friction personal SaaS price for technical job seekers. |

Annual pricing, Premium, trials, coupons, student pricing, lifetime deals, and
usage overages should wait until the basic subscription loop is stable.

### Initial Quotas

Quota counts should reset on the user's Stripe billing period for paid users
and on a calendar-month period for free users.

| Capability | Free | Pro | Counted event |
| --- | ---: | ---: | --- |
| Job searches | 3/month | 50/month | `job_search_run` |
| AI-scored job matches | 30/month | 500/month | `job_match_score` |
| Company research runs | 2/month | 25/month | `company_research_run` |
| Job-tailored resumes | 2/month | 30/month | `tailored_resume_generate` |
| Base resume generations | 2/month | 10/month | `base_resume_generate` |
| Resume extractions | 2/month | 10/month | `resume_extract` |
| Saved jobs | Unlimited | Unlimited | Not quota-counted initially |

Reasoning:

- Job search itself is cheap, but scoring returned jobs is not. Count both the
  search run and the number of scored jobs.
- Browserbase company research and tailored resume generation are the premium
  value moments and should be gated more tightly.
- Saved jobs should not be quota-limited at first because they are app state,
  not the costly operation.

### Billing Surface

Use hosted Stripe surfaces first:

- Checkout: Stripe Checkout through InsForge payments.
- Billing management: Stripe Customer Portal through InsForge payments.
- In-app UI: show plan, current-period usage, and upgrade/manage buttons.

Recommended routes:

| Route | Purpose |
| --- | --- |
| `/pricing` | Public pricing page with Free and Pro comparison. |
| `/dashboard` | Add a compact plan and usage summary. |
| `/profile` | Add a billing/account section with Manage billing. |
| `/api/billing/checkout` | Authenticated endpoint that creates a checkout session. |
| `/api/billing/portal` | Authenticated endpoint that creates a customer portal session. |

If adding `/pricing` is approved, keep the top-navbar pattern and avoid a
sidebar or drawer. Public pricing can be linked from homepage/login CTAs and
the footer first; authenticated navigation should stay Dashboard, Find Jobs,
Profile unless explicitly expanded.

## Data Model Plan

Add app-owned tables before any payment UI. These tables keep the product's
state stable even if Stripe or InsForge webhook delivery is delayed.

### `user_entitlements`

One row per user.

Recommended columns:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `plan_key text not null default 'free'`
- `status text not null default 'active'`
- `stripe_customer_id text`
- `stripe_subscription_id text`
- `stripe_price_id text`
- `current_period_start timestamptz`
- `current_period_end timestamptz`
- `cancel_at_period_end boolean not null default false`
- `source text not null default 'system'`
- `updated_at timestamptz not null default now()`

RLS:

- Users can select their own entitlement row.
- Users cannot insert, update, or delete entitlement rows directly.
- Server/webhook code updates entitlements through the approved backend path.

### `usage_ledger`

Append-only quota events.

Recommended columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `event_type text not null`
- `quantity integer not null default 1`
- `idempotency_key text not null`
- `period_start timestamptz not null`
- `period_end timestamptz not null`
- `source_route text`
- `reference_id uuid`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Constraints and indexes:

- `quantity > 0`
- `unique(user_id, event_type, idempotency_key)`
- index `(user_id, event_type, period_start, period_end)`
- index `(user_id, created_at desc)`

RLS:

- Users can select their own usage rows.
- Users cannot insert, update, or delete usage rows directly from the client.
- Server routes insert rows only after auth and quota checks.

### `billing_webhook_events`

Idempotency log for webhook processing.

Recommended columns:

- `stripe_event_id text primary key`
- `event_type text not null`
- `processed_at timestamptz not null default now()`
- `payload jsonb not null`
- `processing_status text not null`
- `error text`

RLS:

- No user-facing access.
- Webhook processing only.

## Entitlement Rules

The app should compute access from `user_entitlements`, not from raw Stripe
objects at request time.

Suggested mapping:

| Stripe state | App entitlement |
| --- | --- |
| No subscription | Free |
| `active` or `trialing` Pro subscription | Pro |
| `past_due` | Keep Pro during a short grace window, then downgrade |
| `canceled`, `unpaid`, or deleted subscription | Free |
| Checkout success redirect only | No entitlement change until webhook state arrives |

Webhook-backed events to handle first:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

`invoice.paid` is the safest positive signal for provisioning paid access when
the subscription is active. Subscription update and delete events keep local
state synchronized after portal changes.

## Implementation Sequence

### Phase 6S.0 - Review And Enablement

Goal: approve product decisions and unblock backend capability.

Tasks:

1. Review this plan and confirm single-user billing only.
2. Confirm Free and Pro as the first two plans.
3. Confirm initial Pro price and quota numbers.
4. Confirm whether `/pricing` is approved as a new public route.
5. Enable InsForge payments for `JobApplication`.
6. Re-run `npx @insforge/cli payments stripe status --json`.
7. Stay in Stripe test mode.

Exit criteria:

- This plan is approved or revised.
- InsForge payments reports available, or a direct Stripe fallback is
  explicitly approved.

### Phase 6S.1 - Billing Domain Foundation

Goal: add entitlement and usage foundations without checkout UI.

Tasks:

1. Add migrations for `user_entitlements`, `usage_ledger`, and
   `billing_webhook_events`.
2. Add owner-scoped RLS and no-client-write policies.
3. Add `lib/billing/plans.ts` with Free and Pro plan definitions.
4. Add `lib/billing/entitlements.ts` for reading the current user's plan.
5. Add `lib/billing/usage.ts` for current-period usage totals.
6. Add pure tests for quota math and period handling.
7. Document the new tables in `context/architecture.md` and
   `context/library-docs.md`.

Exit criteria:

- Free plan entitlement resolves for every authenticated user.
- No checkout or billing portal route exists yet.
- Tests, lint, build, and `git diff --check` pass.

### Phase 6S.2 - Quota Enforcement

Goal: protect expensive operations before paid upgrade is exposed.

Guard these routes:

- `/api/agent/find`
- `/api/agent/research`
- `/api/resume/extract`
- `/api/resume/generate`
- `/api/jobs/[id]/tailored-resume`

Tasks:

1. Add `assertQuotaAvailable(userId, eventType, quantity)`.
2. Add `recordUsage(userId, eventType, quantity, idempotencyKey, metadata)`.
3. Make quota checks happen before expensive third-party calls.
4. Make usage inserts happen after successful expensive work, unless a route
   must reserve quota before work to prevent concurrent abuse.
5. Return a typed `402` or `429` style response for quota exceeded.
6. Add UI handling for quota exceeded states near the triggering action.
7. Preserve existing PostHog event names; add new events only after updating
   `context/code-standards.md`.

Exit criteria:

- Free users cannot exceed the configured free quota.
- Existing non-quota behavior does not regress.
- Tests cover allowed, exhausted, and idempotent cases.

### Phase 6S.3 - Read-Only Plan And Usage UI

Goal: make plan state visible before accepting payment.

Tasks:

1. Add a compact plan summary to the dashboard Today workspace.
2. Add a billing/account section to Profile.
3. Show current plan, period end, and usage progress for quota-counted events.
4. Add upgrade buttons only if checkout is approved and backend payments are
   available; otherwise show review/coming-soon copy.
5. Update `context/ui-registry.md` for new UI components.

Exit criteria:

- Users can see their free plan and quota usage.
- No checkout action is visible unless the backend gate is open.
- Desktop and mobile light/dark visual checks pass.

### Phase 6S.4 - Stripe Test Checkout

Goal: allow a signed-in user to subscribe to Pro in Stripe test mode.

Tasks:

1. Create Stripe test products and prices for Pro.
2. Store price IDs in server-only environment/config.
3. Add authenticated `/api/billing/checkout`.
4. Use InsForge payments checkout session creation with a server-selected
   subject and price. Do not accept arbitrary subject IDs from the client.
5. Use success and cancel URLs only for navigation.
6. Add a post-checkout pending state that tells users billing may take a moment
   to update.
7. Add route tests for unauthenticated access, invalid plan, and session
   creation failure.

Exit criteria:

- Stripe test checkout can be opened by an authenticated user.
- No local entitlement changes happen from the success URL alone.

### Phase 6S.5 - Webhook Fulfillment

Goal: make Stripe events the source of truth for paid access.

Tasks:

1. Add webhook processing through the approved InsForge payments/webhook
   mechanism.
2. Verify event signatures if direct Stripe fallback is approved.
3. Insert into `billing_webhook_events` before applying changes.
4. Upsert `user_entitlements` from subscription and invoice events.
5. Make webhook processing idempotent by `stripe_event_id`.
6. Add tests for duplicate events, out-of-order events, subscription deletion,
   invoice payment failure, and active subscription restoration.

Exit criteria:

- A successful test subscription updates the user to Pro.
- Canceling in Stripe test mode downgrades or schedules downgrade correctly.
- Duplicate events do not double-process.

### Phase 6S.6 - Customer Portal

Goal: let users manage billing without building subscription-management UI.

Tasks:

1. Configure Stripe Customer Portal in test mode.
2. Add authenticated `/api/billing/portal`.
3. Create portal sessions only for the current user's stored Stripe customer.
4. Add Manage billing button in Profile.
5. Handle the no-customer/free-plan state cleanly.

Exit criteria:

- Pro users can open the hosted portal.
- Portal subscription changes flow back through webhook state.

### Phase 6S.7 - Pricing Page

Goal: publish a clear public Free vs Pro comparison.

Tasks:

1. Add `/pricing` only after route approval.
2. Keep copy factual and conservative.
3. Use project tokens only; no raw colors or hardcoded hex values.
4. Link upgrade CTA to login when logged out and checkout when logged in.
5. Keep the existing top navbar pattern. No sidebar or drawer.
6. Update `context/ui-registry.md`.

Exit criteria:

- Pricing page is responsive in light and dark mode.
- Unauthenticated users are routed through login before checkout.

### Phase 6S.8 - Production Readiness

Goal: prepare for live billing without turning it on accidentally.

Tasks:

1. Verify all test-mode flows end to end.
2. Confirm refund/cancellation policy copy.
3. Confirm support contact and billing email.
4. Confirm tax responsibility and whether Stripe Tax is needed.
5. Confirm live Stripe products/prices.
6. Switch live mode only after explicit approval.
7. Run a final review before triggering CodeRabbit.

Exit criteria:

- Live mode is explicitly approved.
- Test mode checkout, portal, webhook, quota, and downgrade flows are verified.

## Route And Code Targets

Likely new files:

- `lib/billing/plans.ts`
- `lib/billing/entitlements.ts`
- `lib/billing/usage.ts`
- `lib/billing/stripe-events.ts`
- `app/api/billing/checkout/route.ts`
- `app/api/billing/portal/route.ts`
- `app/pricing/page.tsx`
- `components/billing/PlanSummary.tsx`
- `components/billing/UsageMeter.tsx`
- `components/billing/BillingActions.tsx`
- `tests/billing-plans.test.ts`
- `tests/billing-usage.test.ts`
- `tests/billing-webhooks.test.ts`

Likely modified files:

- `app/api/agent/find/route.ts`
- `app/api/agent/research/route.ts`
- `app/api/resume/extract/route.ts`
- `app/api/resume/generate/route.ts`
- `app/api/jobs/[id]/tailored-resume/route.ts`
- `app/dashboard/page.tsx`
- `app/profile/page.tsx`
- `context/architecture.md`
- `context/code-standards.md`
- `context/library-docs.md`
- `context/progress-tracker.md`
- `context/ui-registry.md`

## Tracking And Analytics

Existing PostHog events must keep their current names:

- `job_search_started`
- `job_found`
- `profile_completed`
- `company_researched`

Possible new PostHog events, if approved:

- `billing_checkout_started`
- `billing_checkout_completed`
- `billing_portal_opened`
- `quota_limit_reached`
- `plan_changed`

Add these to `context/code-standards.md` before using them.

The usage ledger is the product quota source of truth. PostHog remains for
analytics and reporting, not entitlement enforcement.

## Security And Reliability Rules

- Never commit Stripe keys or `.env` files.
- Keep all payment config server-side.
- Do not accept price IDs, subject IDs, or customer IDs directly from clients.
- Fulfill entitlements from webhooks, not from success URLs.
- Make webhook processing idempotent.
- Add RLS before exposing any billing rows to the UI.
- Treat quota checks as server-side controls, not only disabled buttons.
- Keep generated PDFs and private storage access behind authenticated routes.
- Use Stripe test mode first. Live mode requires separate explicit approval.

## Review Checklist

Confirm these before implementation:

- [ ] Billing is single-user only.
- [ ] Free and Pro are the only launch plans.
- [ ] Pro price is approved.
- [ ] Initial quotas are approved.
- [ ] `/pricing` is approved as a route addition.
- [ ] InsForge payments will be enabled, or direct Stripe fallback is approved.
- [ ] Stripe test mode is the first implementation target.
- [ ] No teams, organizations, admin dashboard, coupons, trials, or overages in
      the first release.

## Verification Plan

For every implementation slice:

- `npm test`
- `npm run lint`
- `npm run build`
- `git diff --check`

Additional checks before merge:

- RLS policy review for billing tables.
- Route tests for unauthenticated users.
- Quota exceeded tests for every guarded expensive operation.
- Webhook idempotency tests.
- Stripe test checkout and portal manual run.
- Desktop and mobile browser screenshots for any UI.
- Light and dark theme checks for billing/pricing UI.
- Console warning/error check.

## External Documentation To Re-check Before Coding

- Stripe Checkout Session API:
  `https://docs.stripe.com/api/checkout/sessions/create`
- Stripe subscription webhooks:
  `https://docs.stripe.com/billing/subscriptions/webhooks`
- Stripe webhook security:
  `https://docs.stripe.com/webhooks`
- Stripe Customer Portal:
  `https://docs.stripe.com/customer-management/integrate-customer-portal`
- Stripe usage-based billing:
  `https://docs.stripe.com/billing/subscriptions/usage-based/advanced/about`
- InsForge payments docs and installed SDK types.

