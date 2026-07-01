# Architecture

## Stack

| Layer                          | Tool                     | Purpose                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------ |
| Framework                      | Next.js 16 (App Router)  | Full stack framework                             |
| Auth + DB + Storage + Realtime | InsForge                 | Entire backend                                   |
| Cloud browser                  | Browserbase              | Company research — browsing company public pages |
| AI browser control             | Stagehand                | Company page interaction and content extraction  |
| Job Discovery                  | Provider adapters        | Adzuna, Remotive, USAJOBS, and configured ATS boards |
| AI model                       | Gemini 2.5 Flash         | Matching, research synthesis, extraction, tailoring |
| Analytics                      | PostHog                  | Event tracking and dashboard charts              |
| PDF generation                 | @react-pdf/renderer      | Resume PDF rendering                             |
| Styling                        | Tailwind CSS + shadcn/ui | UI components and styling                        |
| Language                       | TypeScript strict        | Throughout                                       |

---

## Folder Structure

```
/
├── AGENTS.md
├── context/
│   ├── project-overview.md
│   ├── architecture.md
│   ├── ui-tokens.md
│   ├── ui-rules.md
│   ├── ui-registry.md
│   ├── code-standards.md
│   ├── library-docs.md
│   ├── build-plan.md
│   └── progress-tracker.md
├── app/
│   ├── layout.tsx                          → Root layout, PostHog provider
│   ├── page.tsx                            → Homepage
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx                   → Login page
│   │
│   ├── dashboard/
│   │   └── page.tsx                       → Main dashboard
│   ├── profile/
│   │   └── page.tsx                       → Profile form + resume management
│   ├── find-jobs/
│   │   ├── page.tsx                       → Find Jobs page — search controls + jobs list
│   │   └── [id]/
│   │       └── page.tsx                   → Individual job details page
│   └── api/
│       ├── auth/
│       │   ├── callback/route.ts          → OAuth callback handler
│       │   └── refresh/route.ts           → Session refresh handler
│       ├── agent/
│       │   ├── find/route.ts              → Trigger multi-source job discovery
│       │   └── research/route.ts          → Trigger company research agent
│       ├── resume/
│       │   ├── generate/route.ts          → Generate base resume PDF from profile
│       │   └── extract/route.ts           → Extract profile data from uploaded resume PDF
│       └── jobs/
│           └── [id]/
│               └── tailored-resume/
│                   ├── route.ts           → Generate job-tailored resume PDF
│                   └── download/route.ts  → Download latest unexpired tailored resume
├── agent/
│   ├── job-discovery.ts                   → Provider orchestration, dedupe, Gemini scoring, save
│   ├── job-sources/                       → Adzuna, Remotive, USAJOBS, Greenhouse, Lever, Ashby adapters
│   ├── research.ts                        → Company research — Browserbase + Stagehand + Gemini
│   ├── matcher.ts                         → Gemini job matching logic
│   ├── extractor.ts                       → Gemini resume extraction + structuring
│   ├── tailored-resume.ts                 → Job-tailored resume rewrite agent
│   └── types.ts                           → Agent-specific TypeScript types
├── actions/
│   ├── profile.ts                         → Profile save + update
│   └── jobs.ts                            → Job status updates
├── components/
│   ├── ui/                                → shadcn/ui components only
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── homepage/
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Features.tsx
│   ├── dashboard/
│   │   ├── StatsBar.tsx
│   │   ├── RecentActivity.tsx
│   │   └── AnalyticsCharts.tsx
│   ├── profile/
│   │   ├── ProfileForm.tsx
│   │   ├── ResumeUpload.tsx
│   │   ├── ResumePreview.tsx
│   │   └── CompletionIndicator.tsx
│   ├── find-jobs/
│   │   ├── SearchControls.tsx
│   │   ├── JobsTable.tsx
│   │   ├── JobFilters.tsx
│   │   └── JobsPagination.tsx
│   └── job-details/
│       ├── JobInfo.tsx
│       ├── MatchScore.tsx
│       ├── JobDescription.tsx
│       ├── CompanyResearch.tsx
│       └── JobActions.tsx
├── lib/
│   ├── insforge-client.ts                 → InsForge browser client instance
│   ├── insforge-server.ts                 → InsForge server client
│   ├── browserbase.ts                     → Browserbase session creation + management
│   ├── stagehand.ts                       → Stagehand initialisation with Browserbase session
│   ├── adzuna.ts                          → Adzuna API client
│   ├── posthog-client.ts                  → PostHog browser client
│   ├── posthog-server.ts                  → PostHog server client
│   ├── posthog-query.ts                   → PostHog Query API (HogQL) client — F17
│   ├── dashboard-stats.ts                 → Dashboard stat math — F15
│   ├── dashboard-activity.ts              → Recent activity merge + formatting — F16
│   ├── dashboard-charts.ts                → Chart transforms + PostHog fetchers — F17
│   └── utils.ts                           → Shared utility functions
└── types/
    └── index.ts                           → Global TypeScript types
```

---

## System Boundaries

| Folder        | Owns                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `app/`        | Pages and API routes only. No business logic.                                                          |
| `agent/`      | All agent logic. Job discovery providers, company research, matching, extraction, tailored resumes. Nothing here touches React. |
| `actions/`    | Server Actions for UI-triggered mutations only. Profile save, profile update.                          |
| `components/` | UI only. No data fetching logic. No direct DB calls.                                                   |
| `lib/`        | Third party client initialisation and shared utilities only.                                           |
| `types/`      | TypeScript types shared across the project.                                                            |

---

## Data Flow

### UI Mutations (Server Actions)

```
User interaction in component
        ↓
Server Action in actions/
        ↓
InsForge DB write
        ↓
Revalidate or redirect
```

### Agent Operations (API Routes)

```
User clicks Find Jobs
        ↓
API route in app/api/agent/find
        ↓
Calls agent/job-discovery.ts
        ↓
Enabled providers return normalized job listings
        ↓
Agent tolerates partial source failures and dedupes by provider id + canonical URL
        ↓
Gemini 2.5 Flash scores each job against user profile
        ↓
Agent writes results to InsForge DB
        ↓
Page data revalidated
```

### Company Research (API Routes)

```
User clicks Research Company on job details page
        ↓
API route in app/api/agent/research
        ↓
Calls agent/research.ts
        ↓
Single Browserbase session opens with Stagehand
        ↓
Navigates to company homepage + sub pages
        ↓
Gemini 2.5 Flash synthesizes dossier from extracted content
        ↓
Dossier saved to jobs.company_research
        ↓
Page data revalidated
```

### Resume Operations (API Routes)

```
User uploads resume or clicks Generate
        ↓
API route in app/api/resume/
        ↓
Gemini 2.5 Flash processes content
        ↓
@react-pdf/renderer renders PDF buffer
        ↓
New PDF uploaded to InsForge Storage
        ↓
URL saved to profiles table
```

### Job-Tailored Resume Operations (API Routes)

```text
User clicks Generate Tailored Resume on job details page
        ↓
API route in app/api/jobs/[id]/tailored-resume
        ↓
Loads saved job details + current profile scoped to user
        ↓
agent/tailored-resume.ts rewrites resume content for this job
        ↓
@react-pdf/renderer renders PDF buffer
        ↓
New PDF uploaded to temporary InsForge Storage path
        ↓
Row saved to tailored_resumes with expires_at = generated_at + 15 days
        ↓
Daily cleanup deletes expired storage objects and rows
```

---

## InsForge Database Schema

### `profiles`

| Column              | Type        | Notes                                        |
| ------------------- | ----------- | -------------------------------------------- |
| id                  | uuid        | References auth.users                        |
| full_name           | text        |                                              |
| email               | text        | Pre-filled from auth                         |
| phone               | text        |                                              |
| location            | text        | City, country                                |
| current_title       | text        | Most recent job title                        |
| experience_level    | text        | junior / mid / senior / lead                 |
| years_experience    | integer     |                                              |
| skills              | text[]      | Array of skill tags                          |
| industries          | text[]      | Industries worked in                         |
| work_experience     | jsonb       | Array of up to 3 roles                       |
| education           | jsonb       | Degree, field, institution, year             |
| job_titles_seeking  | text[]      | Roles they want                              |
| remote_preference   | text        | remote / onsite / hybrid / any               |
| preferred_locations | text[]      | Optional preferred locations                 |
| salary_expectation  | text        | Optional                                     |
| cover_letter_tone   | text        | formal / casual / enthusiastic               |
| linkedin_url        | text        |                                              |
| portfolio_url       | text        |                                              |
| work_authorization  | text        | citizen / permanent_resident / visa_required |
| resume_pdf_url      | text        | InsForge Storage URL of current resume       |
| is_complete         | boolean     | True when all required fields filled         |
| created_at          | timestamptz |                                              |
| updated_at          | timestamptz |                                              |

### `agent_runs`

| Column             | Type        | Notes                        |
| ------------------ | ----------- | ---------------------------- |
| id                 | uuid        |                              |
| user_id            | uuid        | References profiles          |
| status             | text        | running / completed / failed |
| job_title_searched | text        |                              |
| location_searched  | text        |                              |
| jobs_found         | integer     | Total jobs discovered        |
| started_at         | timestamptz |                              |
| completed_at       | timestamptz |                              |

### `jobs`

| Column             | Type        | Notes                                          |
| ------------------ | ----------- | ---------------------------------------------- |
| id                 | uuid        |                                                |
| run_id             | uuid        | References agent_runs — null if from URL input |
| user_id            | uuid        | References profiles                            |
| source             | text        | search / url                                   |
| source_url         | text        | Original job listing URL                       |
| external_apply_url | text        | Direct company apply URL                       |
| source_provider    | text        | adzuna / remotive / usajobs / greenhouse / lever / ashby / manual |
| source_display_name | text       | Reader-facing source label                     |
| source_provider_job_id | text    | Provider-native posting identity               |
| posted_at          | timestamptz | Provider posting date, if supplied             |
| source_metadata    | jsonb       | Bounded provider-specific metadata object      |
| title              | text        |                                                |
| company            | text        |                                                |
| location           | text        |                                                |
| salary             | text        | If available                                   |
| job_type           | text        | fulltime / parttime / contract                 |
| about_role         | text        | 2-3 sentence summary                           |
| responsibilities   | text[]      | Bullet points                                  |
| requirements       | text[]      | Bullet points                                  |
| nice_to_have       | text[]      | Optional                                       |
| benefits           | text[]      | Optional                                       |
| about_company      | text        | Brief company description                      |
| match_score        | integer     | 0-100 scored against main profile              |
| match_reason       | text        | Gemini explanation                             |
| matched_skills     | text[]      | Skills user has that match                     |
| missing_skills     | text[]      | Skills user lacks                              |
| company_research   | jsonb       | Company dossier from research agent            |
| researched_at      | timestamptz | Set when company research is saved (F16)       |
| found_at           | timestamptz |                                                |

### `agent_logs`

| Column     | Type        | Notes                            |
| ---------- | ----------- | -------------------------------- |
| id         | uuid        |                                  |
| run_id     | uuid        | References agent_runs            |
| user_id    | uuid        | References profiles              |
| message    | text        | Human readable log entry         |
| level      | text        | info / success / warning / error |
| job_id     | uuid        | Optional — related job           |
| created_at | timestamptz |                                  |

### `tailored_resumes`

| Column       | Type        | Notes                                      |
| ------------ | ----------- | ------------------------------------------ |
| id           | uuid        |                                            |
| user_id      | uuid        | References profiles                        |
| job_id       | uuid        | References jobs                            |
| storage_key  | text        | InsForge Storage key for the generated PDF |
| storage_url  | text        | Authenticated download route or signed URL |
| file_name    | text        | Download filename                          |
| generated_at | timestamptz | When the tailored PDF was generated        |
| expires_at   | timestamptz | 15 days after generation                   |

---

## InsForge Storage

| Bucket           | Path                                                   | Contents                          |
| ---------------- | ------------------------------------------------------ | --------------------------------- |
| resumes          | resumes/{user_id}/resume.pdf                           | Current active resume PDF         |
| tailored-resumes | tailored-resumes/{user_id}/{job_id}/{resume_id}.pdf    | Temporary job-tailored resume PDFs |

Access: authenticated users only, own files only. Tailored resume rows are scoped by `user_id`; download routes must also verify the requested job belongs to the current user.

---

## Authentication

- Provider: InsForge Auth
- Methods: Google OAuth, GitHub OAuth
- Protected routes: /dashboard, /profile, /find-jobs, /find-jobs/[id]
- Public routes: /, /login
- Next.js 16 Proxy in `proxy.ts` checks session on every protected route
- On login → redirect to /dashboard

---

## InsForge Client Pattern

Two separate InsForge instances — never mix them:

```typescript
// lib/insforge-client.ts
// Browser-side — used in client components for auth state
import { createBrowserClient } from "@insforge/sdk/ssr";
export const insforge = createBrowserClient();

// lib/insforge-server.ts
// Server-side — used in API routes, Server Actions, agent code
import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  return createServerClient({
    cookies: await cookies(),
  });
};
```

---

## Browserbase Session Pattern

```typescript
// Company research session — single session, sequential page visits
const session = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  timeout: 120, // 2 minute session — visits 3-4 pages max
});
```

---

## Job Discovery Pattern

`app/api/agent/find/route.ts` keeps the public request shape `{ jobTitle, location }`.
It calls `agent/job-discovery.ts`, which loads enabled `JobSourceProvider`
adapters from `JOB_SOURCE_PROVIDERS` plus optional `JOB_SOURCE_ATS_BOARDS`.

V1 providers:

- `adzuna`: existing Adzuna API path through `lib/adzuna.ts`, including
  `category=it-jobs`, remote-marker stripping, country detection, and stable
  canonical URL storage.
- `remotive`: public remote jobs API.
- `usajobs`: public USAJOBS search API, only configured when
  `USAJOBS_API_KEY` and `USAJOBS_USER_AGENT` are present.
- `greenhouse`, `lever`, `ashby`: public company-board APIs, only useful when
  board slugs are configured in `JOB_SOURCE_ATS_BOARDS`.

All adapters return `NormalizedJobPosting`. The orchestrator records source
outcomes independently, continues through partial source failures, dedupes by
provider-native id plus canonical `source_url`, caps scoring per run based on
remaining `job_match_score` quota, scores with Gemini, and saves normalized
jobs with `source = 'search'` plus provider columns.

---

## Company Research Pattern

```typescript
// Single session — visits company homepage and sub pages sequentially
const stagehand = createCompanyResearchStagehand(session.sessionId);

await stagehand.init();
const page = await stagehand.context.awaitActivePage();

// Clean company name and construct homepage URL
const cleanName = companyName
  .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?).*$/i, "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "");

const homepageUrl = `https://www.${cleanName}.com`;

// Navigate and extract — graceful fallback if page not found
try {
  await page.goto(homepageUrl, { waitUntil: "networkidle", timeoutMs: 30_000 });
  const content = await stagehand.extract(
    "Extract company research signals from this page.",
    companyResearchSchema,
    { timeout: 30_000, serverCache: false },
  );
} catch (error) {
  // Log and continue — Gemini will synthesize from what was found
  await logAgentError(jobId, error);
}

// Always close session when done
await stagehand.close();
```

---

## Invariants

Rules the AI agent must never violate:

- API routes contain no UI logic. Components contain no DB logic.
- Agent code in `/agent` never imports from `/components` or `/actions`.
- Server Actions never call agent functions. Agent functions are only called from API routes.
- All InsForge server-side writes use `createInsforgeServer()` — never the browser client.
- No hardcoded hex values or raw Tailwind color classes in components — use CSS variables from ui-tokens.md.
- Every Stagehand action is wrapped in try/catch. Failures are logged to agent_logs, never thrown to crash the run.
- Company research always returns a dossier — even if browser research fails, Gemini synthesizes from company name and job description alone. Never return empty.
- Browserbase sessions are always closed with stagehand.close() when done — never leave sessions open.
- Always scope InsForge queries to the current user_id — never query without a user filter.
- Adzuna API always includes category=it-jobs — never search without this filter.
- Job source adapters must return `NormalizedJobPosting`; downstream matching and saving must not depend on raw provider shapes.
- Source failures are source-scoped. One failed provider must not fail a run when another enabled provider succeeds.
- jobs.source is always 'search' or 'url' — never any other value.
- Search jobs keep `jobs.source = 'search'` and store provider identity in `source_provider`, `source_display_name`, and `source_provider_job_id`.
