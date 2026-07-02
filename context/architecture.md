# Architecture

This document is the current project map. Keep it aligned with the live tree when
features move files, add tables, or change ownership boundaries.

## Stack

| Layer | Tool | Purpose |
| --- | --- | --- |
| Framework | Next.js 16 App Router | Pages, API routes, Server Components, Server Actions |
| Auth + DB + Storage + Realtime | InsForge | Backend, storage, auth, edge functions, payments gateway |
| Cloud browser | Browserbase | Company research browser sessions |
| AI browser control | Stagehand | Company page interaction and extraction |
| Job discovery | Provider adapters | Adzuna, Remotive, USAJOBS, Greenhouse, Lever, Ashby |
| AI model | Gemini 2.5 Flash | Matching, research synthesis, profile extraction, resume generation |
| Analytics | PostHog | Product events and dashboard charts |
| PDF generation | @react-pdf/renderer | Base and tailored resume PDFs |
| Styling | Tailwind CSS v4 + semantic tokens | Tokenized custom components, no shadcn/ui layer |
| Language | TypeScript strict | App, agent, lib, and tests |

## Folder Structure

```text
/
  AGENTS.md
  proxy.ts
  migrations/
    *.sql
  functions/
    cleanup-tailored-resumes.js
  context/
    project-overview.md
    architecture.md
    ui-tokens.md
    ui-rules.md
    ui-registry.md
    code-standards.md
    library-docs.md
    build-plan.md
    progress-tracker.md
  app/
    layout.tsx
    page.tsx
    error.tsx
    not-found.tsx
    globals.css
    (auth)/login/page.tsx
    (app)/layout.tsx
    (app)/dashboard/
    (app)/find-jobs/
    (app)/find-jobs/[id]/
    (app)/profile/
    api/auth/
    api/agent/find/route.ts
    api/agent/research/route.ts
    api/resume/extract/route.ts
    api/resume/generate/
    api/resume/download/route.ts
    api/jobs/[id]/tailored-resume/
    api/billing/
    pricing/
    privacy/
    terms/
  agent/
    job-discovery.ts
    job-discovery-utils.ts
    job-sources/
    matcher.ts
    extractor.ts
    generator.ts
    tailored-resume.ts
    research.ts
    research-browser-collection.ts
    research-fallback.ts
    research-synthesis-prompt.ts
    research-types.ts
    types.ts
  actions/
    auth.ts
    profile.ts
  components/
    auth/
    billing/
    dashboard/
    find-jobs/
    homepage/
    job-details/
    layout/
    profile/
    PostHogPageView.tsx
    PostHogProvider.tsx
  lib/
    agent-find-route.ts
    auth.ts
    billing/
    browserbase.ts
    company-research.ts
    company-research-tech.ts
    company-research-url.ts
    dashboard-activity.ts
    dashboard-charts.ts
    dashboard-stats.ts
    engagement-insights.ts
    env.ts
    insforge-client.ts
    insforge-server.ts
    posthog-*.ts
    resume-pdf-document.tsx
    stagehand.ts
    storage-errors.ts
    tailored-resume.ts
    tailored-resume-download.ts
    utils.ts
  tests/
    *.test.ts
```

## Ownership Boundaries

| Folder | Owns |
| --- | --- |
| `app/` | Pages and API route handlers. Route handlers orchestrate auth, quota, and persistence; UI files stay in components. |
| `agent/` | Agent behavior: job discovery, provider adapters, matching, extraction, company research, and resume rewriting. Agent code does not import React components or Server Actions. |
| `actions/` | Server Actions for UI-triggered auth/profile mutations. |
| `components/` | UI only. Components use props and route-provided data; they do not query InsForge directly. |
| `lib/` | Shared services, app helpers, billing domain logic, URL safety, analytics transforms, storage helpers, and shared PDF rendering. |
| `migrations/` | Append-only InsForge SQL migrations. Never retro-edit applied migrations. |
| `functions/` | InsForge edge functions and scheduled jobs. |
| `types/` | Shared TypeScript domain types. |

## Core Flows

`components/PostHogProvider.tsx` is the only documented component-layer
exception to the InsForge boundary. It may call the browser InsForge auth client
from `useEffect` to identify or reset PostHog users, but it must not read or
write database, storage, billing, or agent data.

### Authenticated Shell

```text
Request to protected route
  -> proxy.ts checks InsForge session
  -> app/(app)/layout.tsx renders shared Navbar/content rail
  -> page Server Component loads user-scoped data
```

Protected routes are `/dashboard`, `/find-jobs`, `/find-jobs/[id]`, and
`/profile`. Public routes are `/`, `/login`, `/pricing`, `/privacy`, and
`/terms`.

### Job Discovery

```text
POST /api/agent/find
  -> lib/agent-find-route.ts validates auth/profile/quota
  -> agent/job-discovery.ts loads enabled providers
  -> agent/job-sources/* returns NormalizedJobPosting rows
  -> Gemini scores reserved jobs
  -> normalized jobs are inserted into InsForge
  -> agent_logs and PostHog events record the run
```

Provider failures are source-scoped. One failed provider must not fail the full
run when another enabled provider succeeds.

### Company Research

```text
POST /api/agent/research
  -> agent/research.ts orchestrates logs and result handling
  -> research-browser-collection follows trusted Adzuna redirects manually
  -> Browserbase + Stagehand collect homepage and sub-page evidence
  -> research-synthesis-prompt asks Gemini for the dossier
  -> research-fallback guarantees a conservative dossier on failure
```

Saved job URLs are followed only when `trustedResearchRedirectUrl()` accepts the
original URL. Each resolved redirect hop must pass `isPublicResearchUrl()` so
loopback, link-local, RFC1918, and local hostnames are rejected before another
fetch.

### Resume Operations

```text
Base resume generate
  -> /api/resume/generate
  -> agent/generator.ts creates content
  -> lib/resume-pdf-document.tsx renders PDF
  -> InsForge Storage resumes/{user_id}/resume.pdf

Tailored resume generate
  -> /api/jobs/[id]/tailored-resume
  -> agent/tailored-resume.ts rewrites content for the saved job
  -> lib/resume-pdf-document.tsx renders the same PDF base with target role
  -> InsForge Storage tailored-resumes/{user_id}/{job_id}/{resume_id}.pdf
  -> tailored_resumes row expires after 15 days
```

The profile base resume and job-tailored resume are separate artifacts.

### Billing and Quotas

```text
Expensive route
  -> recordUsage()
  -> public.record_usage_with_quota_check(...)
  -> public.plan_quotas supplies plan/event limits
  -> usage_ledger records successful reservations
```

`lib/billing/plans.ts` mirrors the seeded `plan_quotas` rows. Tests compare the
TypeScript quota table to the SQL seed migration so plan limits cannot drift
silently from the canonical RPC.

## Database Tables

### Product Data

| Table | Purpose |
| --- | --- |
| `profiles` | User profile, resume URL, preferences, work history, education, completion state. |
| `agent_runs` | Find Jobs run records with status, query, counts, and timestamps. |
| `jobs` | Saved normalized jobs, provider identity, matching fields, company research, researched timestamp. |
| `agent_logs` | User-visible job/search/research status log entries. |
| `tailored_resumes` | Temporary job-tailored resume metadata with storage key, URL, filename, generated/expires timestamps. |

### Billing Data

| Table | Purpose |
| --- | --- |
| `user_entitlements` | Current plan, status, Stripe ids, billing period, cancel flag, source. |
| `usage_ledger` | Idempotent usage reservations by event type and billing period. |
| `billing_webhook_events` | Stripe webhook idempotency and processing status. |
| `plan_quotas` | Canonical plan/event quota limits used by the usage RPC. |

## Storage

| Bucket | Path | Contents |
| --- | --- | --- |
| `resumes` | `resumes/{user_id}/resume.pdf` | Current active base resume PDF. |
| `tailored-resumes` | `tailored-resumes/{user_id}/{job_id}/{resume_id}.pdf` | Temporary job-tailored resume PDFs. |

Routes must verify the current user owns the profile/job/metadata before
streaming or mutating storage-backed artifacts.

## External Services

| Service | Entry Points | Notes |
| --- | --- | --- |
| InsForge | `lib/insforge-client.ts`, `lib/insforge-server.ts`, migrations, functions | Use server client in routes/actions/agent code. App code reads `.env.local`; CLI reads `.insforge/project.json`. |
| Gemini | `agent/gemini.ts` | All calls use timeout helpers and JSON response mode where structured output is required. |
| Browserbase | `lib/browserbase.ts` | Company research uses one session and closes it in `finally`. |
| Stagehand | `lib/stagehand.ts` | Extraction calls are bounded and failures are logged. |
| PostHog | `lib/posthog-client.ts`, `lib/posthog-server.ts`, `lib/posthog-query.ts` | Client capture, server capture, and dashboard HogQL fetches are separate. |
| Stripe via InsForge Payments | `lib/billing/routes.ts`, `app/api/billing/*` | Checkout, portal, webhook fulfillment, and entitlement updates. |

## Invariants

- API routes contain no UI logic. Components contain no database logic.
- Agent code in `agent/` never imports from `components/` or `actions/`.
- Server Actions never call agent functions; route handlers own agent invocation.
- All server-side InsForge writes use `createInsforgeServer()` unless an edge
  cleanup function explicitly creates an admin client with dedicated function
  credentials.
- No hardcoded hex values or raw Tailwind color classes in app UI components.
  PDF rendering is the exception because React PDF cannot consume app CSS
  variables; PDF colors are centralized in `lib/resume-pdf-document.tsx`.
- Every Stagehand action is wrapped in try/catch. Failures are logged and the
  company research flow still returns a dossier.
- Browserbase sessions are always closed with `stagehand.close()` and
  `releaseBrowserbaseSession()`.
- InsForge reads and writes are scoped to the current `user_id`.
- Adzuna searches always include `category=it-jobs` and live inside
  `agent/job-sources/adzuna.ts`.
- Job source adapters return `NormalizedJobPosting`; downstream matching and
  saving must not depend on raw provider shapes.
- `jobs.source` remains `'search'` or `'url'`. Provider identity belongs in
  `source_provider`, `source_display_name`, and `source_provider_job_id`.
