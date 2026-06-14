# Library Docs

Project-specific usage patterns for every third party library in this project. This file only covers how we use each library in this specific project — rules, patterns, and constraints specific to Job Application.

Read the relevant section before implementing any feature that touches these libraries.

---

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. **Check AGENTS.md** at the project root — it lists every skill installed for this project and how to use them. Skills contain up-to-date API documentation, usage patterns, and best practices specific to this codebase.

2. **Check if an MCP server is configured** for that library. Some tools have MCP servers that give the AI agent direct access to documentation, logs, and debugging tools. If an MCP server is available — use it before falling back to general knowledge.

3. **Read this file** for project-specific patterns that override general library knowledge.

The order of authority is:

```
MCP server (real-time docs) → Skills via AGENTS.md → This file (project rules) → General training knowledge
```

Never rely on general training knowledge alone for library APIs — they change frequently and training data may be outdated.

---

## InsForge

**Check first:** Check AGENTS.md for an installed InsForge skill. If an InsForge MCP server is configured — use it. The skill/MCP will have the latest API patterns.

### Client vs Server

Two separate instances — never mix them:

```typescript
// lib/insforge-client.ts — browser context only
import { createBrowserClient } from "@insforge/sdk/ssr";

export const insforge = createBrowserClient();
```

```typescript
// lib/insforge-server.ts — server context only
import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  return createServerClient({
    cookies: await cookies(),
  });
};
```

**Rules:**

- Browser client — Client Components, browser-side auth state, realtime subscriptions
- Server client — Server Components, API routes, Server Actions, agent functions
- Never use browser client in server context
- Never use server client in browser context

---

### Auth

```typescript
// Get current user in server context
const insforge = await createInsforgeServer();
const {
  data: { user },
  error,
} = await insforge.auth.getCurrentUser();
if (!user) redirect("/login");
```

---

### DB Queries

All DB access goes through `insforge.database.from(...)` — NOT `insforge.from(...)`.

```typescript
// Read (single row — may return null if not found)
const { data, error } = await insforge.database
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .maybeSingle();

// Read (list)
const { data, error } = await insforge.database
  .from("jobs")
  .select("*")
  .eq("user_id", user.id)
  .order("found_at", { ascending: false });

// Insert
const { data, error } = await insforge.database
  .from("jobs")
  .insert([{ user_id: user.id, title, company, match_score }])
  .select()
  .single();

// Update
const { error } = await insforge.database
  .from("jobs")
  .update({ company_research: dossier })
  .eq("id", jobId)
  .eq("user_id", user.id); // always scope to user

// Upsert
const { error } = await insforge.database
  .from("profiles")
  .upsert({ id: user.id, ...fields }, { onConflict: "id" })
  .select()
  .single();
```

**Rules:**

- Always scope queries to `user_id` — never query without user filter
- Always handle the `error` return — never assume success
- Use `.single()` when expecting exactly one row

---

### Storage

The real `@insforge/sdk` storage API differs from older docs. Use only these shapes:

```typescript
// Upload — File or Blob only; NO options argument
const { data, error } = await insforge.storage
  .from("resumes")
  .upload(`${userId}/resume.pdf`, file); // file must be File | Blob

// Overwrite strategy — remove then re-upload (no upsert flag exists)
await insforge.storage.from("resumes").remove(`${userId}/resume.pdf`); // ignore error
const { data, error } = await insforge.storage
  .from("resumes")
  .upload(`${userId}/resume.pdf`, file);

// Get public URL — returns a plain string, NOT { data: { publicUrl } }
const url: string = insforge.storage
  .from("resumes")
  .getPublicUrl(`${userId}/resume.pdf`);

// Delete a file
const { error } = await insforge.storage
  .from("resumes")
  .remove(`${userId}/resume.pdf`);
```

**Storage paths:**

- Base resume: `resumes/{user_id}/resume.pdf`
- Tailored resume: `tailored-resumes/{user_id}/{job_id}/{resume_id}.pdf`

**Rules:**

- `upload(path, file)` accepts `File | Blob` — never a `Buffer` or `ArrayBuffer`
- There is no `upsert: true` option on `upload` — use `remove` then `upload` to replace
- `getPublicUrl(path)` returns a plain `string` directly — do NOT destructure `.data.publicUrl`
- Always save the returned URL string to the DB after upload
- Never write files to disk — always upload the `File` directly from FormData

### Tailored Resume Storage

```typescript
const path = `${userId}/${jobId}/${resumeId}.pdf`;
const file = new File([new Uint8Array(buffer)], "tailored-resume.pdf", {
  type: "application/pdf",
});

await insforge.storage.from("tailored-resumes").remove(path); // ignore not-found
const { data, error } = await insforge.storage
  .from("tailored-resumes")
  .upload(path, file);
```

**Rules:**

- Use the `tailored-resumes` bucket/prefix for job-specific PDFs — never overwrite `resumes/{user_id}/resume.pdf`
- Save `storage_key`, `storage_url`, `file_name`, `generated_at`, and `expires_at` in `tailored_resumes`
- `storage_url` is the authenticated app download route or a time-limited signed URL, not a public storage URL
- `expires_at` is 15 days after generation and blocks the authenticated download route after expiry
- Download through an authenticated route that verifies the job and resume row belong to the current user
- Expired rows are not downloadable
- Scheduled cleanup deletes expired private storage objects first, then deletes their `tailored_resumes` rows

---

### Payments - Phase 6 Readiness Only

As of 2026-06-14, payments are not enabled for the linked JobApplication
backend. `npx @insforge/cli payments stripe status --json` returns:

```json
{
  "error": "Payments are not available on this backend.\nSelf-hosted: upgrade your InsForge instance. Cloud/private preview: contact your InsForge admin to enable payments."
}
```

Do not add checkout, billing, subscription, pricing, admin, team, plan limit, or
customer portal app code while this remains true.

**CLI reality check:**

- The local CLI groups Stripe commands under `npx @insforge/cli payments stripe`.
- Use `npx @insforge/cli payments stripe status --json` for availability.
- Do not use generic `secrets` commands for Stripe keys.
- Default to test mode while building; live mode requires explicit approval.

**SDK reality check:**

The installed `@insforge/sdk` types are the source of truth when docs disagree.
In this checkout, `node_modules/@insforge/sdk/dist/*.d.ts` exposes:

```typescript
insforge.payments.createCheckoutSession("test", request);
insforge.payments.createCustomerPortalSession("test", request);
```

Do not copy examples that pass `environment` inside a single object unless the
installed SDK types change.

**Rules before any payment UI:**

- Add RLS on `payments.checkout_sessions` and
  `payments.customer_portal_sessions` for the approved billing subject.
- Do not allow arbitrary `subject.type` or `subject.id` from users.
- Use app-owned tables for user-facing payment or entitlement state.
- Fulfill from webhook-backed payment projections, not success URLs.
- Keep Stripe secret keys out of frontend code and public env vars.

---

## Adzuna API

**Check first:** Check AGENTS.md for an installed Adzuna skill. If none exists — use this file and the official Adzuna API docs.

### Job Search

```typescript
// lib/adzuna.ts
export async function searchJobs(
  jobTitle: string,
  location: string,
  country: string = "us",
): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID!,
    app_key: process.env.ADZUNA_APP_KEY!,
    what: jobTitle,
    category: "it-jobs", // always filter to IT jobs
    results_per_page: "10",
    "content-type": "application/json",
  });

  // Adzuna's `where` is strictly geographic — "Remote" matches no location
  // and returns ZERO results (live-verified). Strip remote markers and omit
  // the parameter entirely when nothing geographic remains.
  const where = normalizeWhere(location); // strips "remote" / "work from home" / "wfh"
  if (where) {
    params.set("where", where);
  }

  const response = await fetch(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}
```

### Response Shape

Each Adzuna job result contains:

```typescript
type AdzunaJob = {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string; // snippet only — not full description
  redirect_url: string; // Adzuna tracking URL → redirects to actual job
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted: "0" | "1"; // "1" means salary is estimated
  contract_type?: string;
  created: string; // ISO date string
  category: { tag: string; label: string };
};
```

### Saving Jobs to DB

```typescript
// Map Adzuna result to jobs table
const jobRecord = {
  user_id: userId,
  run_id: runId,
  source: "search", // always 'search' for Adzuna jobs
  source_url: canonicalSourceUrl(job.redirect_url), // stable identity — the dedupe key
  external_apply_url: job.redirect_url, // full tracking URL — used for apply clicks
  title: job.title,
  company: job.company.display_name,
  location: job.location.display_name,
  salary: formatSalary(job), // agent/adzuna.ts — equal bounds collapse to "$146k", min-only renders "$146k+", null when absent
  job_type: job.contract_type || "fulltime",
  about_role: job.description, // Adzuna returns snippet — used as description
  match_score: scoredJob.matchScore,
  match_reason: scoredJob.matchReason,
  matched_skills: scoredJob.matchedSkills,
  missing_skills: scoredJob.missingSkills,
  found_at: new Date().toISOString(),
};
```

**Rules:**

- Always include `category=it-jobs` — never search Adzuna without this filter
- Adzuna's `where` is strictly geographic — strip remote markers via `normalizeWhere` and omit the parameter when empty or nothing geographic remains (passing "remote" returns 0 results)
- `source` is always `'search'` for Adzuna jobs — never any other value
- `salary_is_predicted: "1"` means Adzuna estimated the salary — this is normal
- Adzuna description is a 500-char snippet — Gemini 2.5-flash (`agent/matcher.ts`) scores from it, not a full description
- Country comes from `detectCountry(location)` (`lib/adzuna.ts`) — keyword sniff for `gb`/`au`/`ca`, default `'us'`
- Real results can omit any field (`contract_type` is often missing) — narrow to `UsableAdzunaJob` before scoring and default `job_type` to `"fulltime"`
- `redirect_url` carries a per-request `?se=` tracking token (live-verified: the same ad returns a different URL on every call) — NEVER dedupe or compare on the raw URL. Store `canonicalSourceUrl(redirect_url)` (origin + path, which embeds the stable ad id) in `source_url`; only `external_apply_url` keeps the full tracking URL

---

## Tailored Resume Agent

**Input sources:**

- Current user's saved profile from `profiles`
- Selected job row from `jobs`, scoped by `id` and `user_id`
- Job fields: title, company, about_role, responsibilities, requirements, nice_to_have, matched_skills, missing_skills

**Rules:**

- The agent runs only from the job details page — the profile Generate Resume button stays unchanged
- Treat `about_role` as a saved job description that may be an Adzuna snippet, not guaranteed full posting text
- Prioritize requirements, responsibilities, and `matched_skills` when choosing keywords
- Never present `missing_skills` as skills the candidate has
- Do not keyword-stuff; rewrite bullets only when supported by the profile
- Facts such as name, contact, companies, titles, dates, education, and skills remain grounded in saved profile data
- Output feeds an ATS-simple PDF: standard headings, single column, no tables, no graphics, no headers/footers
- Store the generated PDF as a temporary tailored resume with a 15-day expiration

---

## Browserbase

**Check first:** Check AGENTS.md for an installed Browserbase skill. If a Browserbase MCP server is configured — use it. The skill/MCP will have the latest session management and API patterns.

### Session Creation — Company Research

```typescript
import Browserbase from "@browserbasehq/sdk";

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

// Single session for company research — sequential page visits
const session = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  timeout: 120, // 2 minute session — visits 3-4 pages max
});
```

**Important — Browserbase runs independently from your Next.js server:**
**Installed reality check (2026-06-10):** `@browserbasehq/sdk@2.14.0` is installed. Feature 13 centralizes this in `lib/browserbase.ts`: create one 120 second Browserbase session, pass its id to Stagehand, call `stagehand.close()`, then explicitly request Browserbase release with `sessions.update(sessionId, { status: "REQUEST_RELEASE", projectId })`. This explicit release is required because Stagehand v3 with `disableAPI: true` closes CDP but does not call the hosted Stagehand API session end path.

**Browse CLI setup note (2026-06-10):** `browse skills install` is installed for Codex at `C:\Users\huuth\.agents\skills\browse\SKILL.md`. If Windows tries to spawn `C:\Program Files\nodejs\npx.cmd` and fails with `C:\Program`, put the user npm shim first in PATH for that command: `$env:PATH='C:\Users\huuth\AppData\Roaming\npm;' + $env:PATH; browse skills install`.

Browserbase sessions run on Browserbase's cloud infrastructure, not inside your Next.js API route. The API route triggers the Browserbase session and returns a response while the session continues running independently on Browserbase's platform. Do not add `maxDuration` or any timeout configuration to Next.js API routes to accommodate Browserbase session length.

**Rules:**

- Always use single sessions — never parallel sessions (free plan limit)
- Session timeout is 120 seconds — sufficient for 3-4 page visits
- Always end sessions cleanly — call stagehand.close() when done
- Project ID always from `process.env.BROWSERBASE_PROJECT_ID` — never hardcode
- Browserbase client lives in `lib/browserbase.ts` — always import from there
- Server-side redirect following for company research must go through `trustedResearchRedirectUrl()` in `lib/company-research-url.ts`; only HTTPS URLs on trusted Adzuna redirect hosts are allowed. Any other saved job URL falls back to `fallbackCompanyHomepage(company)`.
- `jobs.company_research.sources` should contain only pages actually opened and meaningfully extracted; never show guessed homepages or saved job URLs as research sources.

---

## Stagehand

**Check first:** Check AGENTS.md for an installed Stagehand skill. If a Stagehand MCP server is configured — use it. The skill/MCP will have the latest act() and extract() patterns.

### Initialisation

```typescript
import { createCompanyResearchStagehand } from "@/lib/stagehand";

const stagehand = createCompanyResearchStagehand(session.sessionId);

await stagehand.init();
const page = await stagehand.context.awaitActivePage();
```

**Installed reality check (2026-06-10):** `@browserbasehq/stagehand@3.5.0` is installed. Feature 13 uses the v3 method forms: `stagehand.extract(instruction, schema, { timeout, serverCache: false })`, `page.goto(url, { waitUntil: "networkidle", timeoutMs })`, and `await stagehand.context.awaitActivePage()`. Use `lib/stagehand.ts` instead of constructing Stagehand directly in agent code.

### extract()

```typescript
import { z } from "zod";

try {
  const result = await stagehand.extract(
    "Extract the company overview, main product description, and any technology mentions from this page.",
    z.object({
      companyOverview: z.string().optional(),
      mainProduct: z.string().optional(),
      techMentions: z.array(z.string()).optional(),
      navLinks: z
        .array(
          z.object({
            label: z.string(),
            url: z.string(),
          }),
        )
        .optional(),
    }),
    { timeout: 30_000, serverCache: false },
  );
} catch (error) {
  await logAgentError(jobId, error);
}
```

### act()

```typescript
// Always wrap in try/catch
try {
  await stagehand.act({
    action: "Click the About link in the navigation",
  });
} catch (error) {
  await logAgentError(jobId, null, error);
}
```

## Company Research Section

Replace the existing Stagehand "Company Research Pattern" section in library-docs.md with this:

---

### Company Research Pattern

Three-step process: homepage extraction → sub-page extraction → Gemini synthesis.
Job description and user profile come from DB — never re-fetch what you already have.
Browser's only job is the company website.

```typescript
// Step 1 — Homepage extraction
let homepageData = {
  oneLiner: "",
  productSummary: "",
  signals: [],
  pageLinks: [],
};

try {
  homepageData = await stagehand.extract(
    "This is a company's homepage. Capture what the company actually does, who it's for, and any concrete signals (funding, customers, scale, mission, recent launches). Then find the internal links most worth visiting to research them as an employer.",
    z.object({
      oneLiner: z.string().describe("What the company does in one sentence"),
      productSummary: z
        .string()
        .describe("What they build/sell and who it's for"),
      signals: z
        .array(z.string())
        .describe("Funding, notable customers, scale, mission, recent news"),
      pageLinks: z
        .array(
          z.object({
            url: z.string(),
            kind: z.enum([
              "about",
              "careers",
              "blog",
              "engineering",
              "product",
              "team",
              "other",
            ]),
          }),
        )
        .describe("Internal links worth visiting"),
    }),
    { timeout: 30_000, serverCache: false },
  );
} catch (error) {
  await logAgentError(jobId, error);
}

// If oneLiner and productSummary are empty — wrong site or parked domain
// Skip to synthesis with job description and profile only
if (!homepageData.oneLiner && !homepageData.productSummary) {
  // proceed to synthesis with empty companyResearch
}

// Step 2 — Sub-page extraction (max 3, prefer about/blog/engineering/product over careers)
let subPageData = {
  keyPoints: [],
  technologies: [],
  valuesOrCulture: [],
  notable: [],
};

try {
  subPageData = await stagehand.extract(
    "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore nav, footers, cookie banners, and generic marketing copy.",
    z.object({
      keyPoints: z.array(z.string()),
      technologies: z
        .array(z.string())
        .describe("Specific languages, frameworks, tools, platforms"),
      valuesOrCulture: z
        .array(z.string())
        .describe("Stated values, working style, team norms"),
      notable: z
        .array(z.string())
        .describe("Customers, funding, scale, projects, awards"),
    }),
    { timeout: 30_000, serverCache: false },
  );
} catch (error) {
  await logAgentError(jobId, error);
}

// Step 3 — Gemini synthesis (after browser closes)
await stagehand.close();

// Feed three data sources: company research + job from DB + profile from DB
const systemPrompt = `You are a sharp career strategist preparing a candidate to apply for a specific role. You are given (a) research collected from the company's own website, (b) the job posting, and (c) the candidate's profile. Produce a concise, concrete briefing that gives this specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent funding, customers, headcount, or facts. If research was thin, infer carefully from the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON matching this shape:
{
  "companyOverview": string,
  "techStack": string[],
  "culture": string[],
  "whyThisRole": string,
  "yourEdge": string[],
  "gapsToAddress": string[],
  "smartQuestions": string[],
  "interviewPrep": string[],
  "sources": string[]
}`;

const userPrompt = `COMPANY RESEARCH (from their website):
${JSON.stringify(companyResearch)}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Matched skills (already computed): ${job.matched_skills.join(", ")}
Missing skills (already computed): ${job.missing_skills.join(", ")}

CANDIDATE PROFILE:
Current title: ${profile.current_title}
Experience: ${profile.years_experience} years, level ${profile.experience_level}
Skills: ${profile.skills.join(", ")}
Work history: ${JSON.stringify(profile.work_experience)}`;

const ai = createGeminiClient();
let dossier = {
  companyOverview: "",
  techStack: [],
  culture: [],
  whyThisRole: "",
  yourEdge: [],
  gapsToAddress: [],
  smartQuestions: [],
  interviewPrep: [],
  sources: [],
};

try {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
      },
    ],
    config: {
      temperature: 0.4,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  dossier = JSON.parse(response.text ?? "{}");
} catch (error) {
  await logAgentError(jobId, error);
}
```

**Dossier fields:**

| Field           | Type     | Purpose                                             |
| --------------- | -------- | --------------------------------------------------- |
| companyOverview | string   | What the company does                               |
| techStack       | string[] | Technologies they use                               |
| culture         | string[] | Values and working style                            |
| whyThisRole     | string   | Why this role exists                                |
| yourEdge        | string[] | Specific links between THIS candidate and this role |
| gapsToAddress   | string[] | Missing skills reframed as strategy                 |
| smartQuestions  | string[] | Questions that show real research                   |
| interviewPrep   | string[] | Topics to prepare for this role                     |
| sources         | string[] | Pages the company info came from                    |

**Rules:**

- Always use `extract()` with a Zod schema — never parse raw HTML or use regex
- Always wrap every `act()` and `extract()` in try/catch
- Always call `await stagehand.close()` when done — ends the Browserbase session
- Model is always `gemini-2.5-flash` via `createGeminiClient()`
- Temperature is `0.4` for synthesis — grounded but flexible enough to make real connections
- Max 3 sub-pages — never exceed this on free plan
- Always close session in finally block — never leave sessions open even if research fails
- Job description and profile always come from DB — never re-fetch via browser
- If browser research returns empty — still run synthesis with job + profile only
- yourEdge, gapsToAddress, and smartQuestions are the most valuable fields — never skip them

## Gemini 2.5 Flash

> **Model reality check (2026-06-12):** AI features use **Gemini 2.5 Flash** via `@google/genai` and `agent/gemini.ts`: extraction (`agent/extractor.ts`, F07), resume generation (`agent/generator.ts`, F08), job match scoring (`agent/matcher.ts`, F10), company research (`agent/research.ts`, F13), and tailored resume generation (`agent/tailored-resume.ts`, F18).

**Check first:** Use `agent/gemini.ts` and `GEMINI_API_KEY` for app AI calls.

### Structured JSON Response

```typescript
import { createGeminiClient } from "@/agent/gemini";

const ai = createGeminiClient();

let result = null;

try {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Return only valid JSON matching this shape:
{
  "score": number,
  "reason": string
}

Your prompt here`,
          },
        ],
      },
    ],
    config: { temperature: 0.3 },
  });

  const text = (response.text ?? "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in model response");
  }

  result = JSON.parse(jsonMatch[0]);
} catch (error) {
  await logAgentError(jobId, error);
}
```

**Temperature settings:**

- `0.3` — matching, scoring, extraction, research synthesis — deterministic results
- `0.7` — resume generation — natural variation

**Max tokens:**

- Job matching + scoring: `300`
- Company research synthesis: `800`
- Resume generation: `1000`
- Profile extraction from resume: `800`

**Rules:**

- Model string is always `'gemini-2.5-flash'` for current app features
- Always route through `createGeminiClient()` so missing keys fail at request time
- Always parse `response.text` as model text
- Always validate parsed JSON before using — wrap in try/catch
- Match threshold is always `MATCH_THRESHOLD` from `lib/utils.ts` — never hardcode 70
- Company research synthesis must always return a complete dossier — never return empty even if browser research failed

---

## PostHog

**Check first:** Check AGENTS.md for an installed PostHog skill. If a PostHog MCP server is configured — use it. The skill/MCP will have the latest client and server patterns.

**MCP project note (2026-06-10):** the PostHog MCP may default to the wrong context. This app's data lives in project **JobApplication (id 425525)** in org **Tom Nguyen (`019e2bb8-…`)** — if `read-data-schema` shows mobile/language-app events, run `switch-organization` then `switch-project` first. The project `api_token` matches `NEXT_PUBLIC_POSTHOG_KEY`.

### Client Setup (Browser)

```typescript
// lib/posthog-client.ts
import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window !== "undefined") {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
      capture_pageview: false, // manual pageview tracking
    });
  }
}

// Capture event client-side
posthog.capture("job_found", {
  userId,
  source: "search",
  matchScore: score,
});
```

### Server Setup

```typescript
// lib/posthog-server.ts
import { PostHog } from "posthog-node";

export const createPostHogServer = () =>
  new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    flushAt: 1, // send immediately
    flushInterval: 0, // no batching — Next.js functions are short-lived
  });

// Always use and shutdown in the same function
const posthog = createPostHogServer();
posthog.capture({
  distinctId: userId,
  event: "company_researched",
  properties: { userId, jobId, company },
});
await posthog.shutdown(); // required — ensures event is sent
```

**Rules:**

- Always call `await posthog.shutdown()` in server-side functions — events are lost without it
- `flushAt: 1` and `flushInterval: 0` always set on server client
- Event names must match exactly the list in `code-standards.md`
- Always include `userId` as a property on every server-side event
- Call `posthog.identify(userId)` after login on client side
- Call `posthog.reset()` on logout on client side

### Querying Events — Query API / HogQL (Feature 17)

The `phc_` ingestion key **cannot query**. Runtime queries go through the PostHog
Query API with a personal API key, via `lib/posthog-query.ts` — always import
`queryPostHogHogQL` from there, never construct the request inline.

```typescript
// lib/posthog-query.ts — server only
const rows = await queryPostHogHogQL(
  `SELECT toDate(timestamp) AS day, count() AS c
   FROM events
   WHERE event = 'job_found'
     AND distinct_id = {userId}
     AND timestamp >= now() - INTERVAL 30 DAY
   GROUP BY day
   ORDER BY day`,
  { userId },
);
// rows: (string | number | null)[][] — e.g. [["2026-06-09", 40], ["2026-06-10", 11]]
// null on missing config or any request failure — callers degrade, never throw
```

**Env (all required, server-side):**

| Var | Value | Notes |
| --- | ----- | ----- |
| `POSTHOG_PERSONAL_API_KEY` | `phx_…` | Scope `query:read`; created at PostHog → Settings → Personal API Keys. Secret — never `NEXT_PUBLIC_` |
| `POSTHOG_PROJECT_ID` | `425525` | The JobApplication project |
| `POSTHOG_API_HOST` | `https://us.posthog.com` | Query host ≠ ingestion host (`us.i.posthog.com`) |

**Rules:**

- Endpoint is `POST {POSTHOG_API_HOST}/api/projects/{POSTHOG_PROJECT_ID}/query` with body `{ query: { kind: "HogQLQuery", query, values } }` and `Authorization: Bearer` (live-verified 2026-06-10)
- Always pass user input via HogQLQuery `values` placeholders (`{userId}`) — never string-interpolate into SQL
- Always filter on `distinct_id = {userId}` — server captures use `distinctId: userId`, so this scopes to the current user
- `queryPostHogHogQL` returns `null` on missing env or any failure (with `[posthog/query]` logging) — dashboard charts degrade to their empty-state message; never let a PostHog failure crash a page
- The request carries `AbortSignal.timeout(8000)` — a hung endpoint must never block the force-dynamic dashboard SSR (timeouts surface through the existing catch → `null`). Non-OK responses log a 300-char slice of PostHog's error body, which names causes like a missing `query:read` scope
- Chart data shaping lives in `lib/dashboard-charts.ts` (pure, tested transforms: `buildDailySeries` gap-fills rolling windows, `buildMatchDistribution` buckets scores incl. the `<50%` bucket, `computeYAxis` picks nice five-tick axes) — fetchers stay thin
- HogQL `toDate(timestamp)` buckets in the project timezone (US/Central); transform day-keys are UTC-based — a late-evening event can drift one column at window edges, which is accepted
- Charts count PostHog **events**, not InsForge DB rows — totals can legitimately differ from the DB-backed stats bar (events only exist since 2026-06-09; re-found jobs emit one event per save)
- Rate budget: the /query endpoint allows ~120 requests/h — the dashboard issues 3 parallel queries per load, fine for personal use; don't add per-chart polling

---

## Recharts

**Check first:** Check AGENTS.md for an installed recharts skill. None exists as of 2026-06-10 — this section is the project authority.

**Installed reality check (2026-06-10):** `recharts@3.8.1` with React 19. Introduced in Feature 14 for the dashboard mock charts; F17 wired the same components to real PostHog data (see the PostHog Querying section) — the data props were swapped, the charts were not rebuilt.

### Chart Components

The three dashboard charts live in `components/dashboard/` (`ResearchActivityChart`, `JobsOverTimeChart`, `MatchDistributionChart`) — one component per file, each a Client Component (`"use client"`), each rendering its own card shell. Data arrives as typed props from the Server Component page; never fetch inside a chart component. Since F17 each chart also takes `yAxis: YAxisConfig` (page-computed via `computeYAxis` from `lib/dashboard-charts` — type-only import in the chart, so no server code lands in the client bundle) and an optional `emptyMessage`; when `data` is empty the chart renders the message centered in the `h-[280px]` area instead of the plot (RecentActivity's empty-state pattern).

```tsx
<div className="mt-6 h-[280px]">
  <ResponsiveContainer
    width="100%"
    height="100%"
    initialDimension={{ width: 580, height: 280 }}
  >
    <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
      <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10}
        tick={{ fill: "var(--color-chart-axis)", fontSize: 12 }} />
      <YAxis axisLine={false} tickLine={false} width={32}
        tick={{ fill: "var(--color-chart-axis)", fontSize: 12 }}
        ticks={[0, 3, 6, 9, 12]} domain={[0, 12]} />
      <Bar dataKey="count" fill="var(--color-info)" radius={[4, 4, 0, 0]}
        barSize={24} isAnimationActive={false} />
    </BarChart>
  </ResponsiveContainer>
</div>
```

**Rules:**

- `ResponsiveContainer` needs a parent with an explicit height — the house pattern is `mt-6 h-[280px]` inside the chart card
- ALWAYS pass `initialDimension={{ width: <approx card width>, height: 280 }}` — the default is `-1×-1`, which renders once before `ResizeObserver` measures (and during SSR) and logs "The width(-1) and height(-1) of chart should be greater than 0" on every load (×2 in dev StrictMode). The value is a first-paint estimate only; the observer corrects it on mount (live-verified fix, 2026-06-10)
- Colors are ALWAYS CSS-variable strings in recharts props (`var(--color-info)`, `var(--color-success)`, `var(--color-accent)`, `var(--color-chart-axis)`, `var(--color-border)`) — never hex, never raw Tailwind colors; SVG resolves the variables at paint time (runtime-verified)
- `isAnimationActive={false}` on every series (`Bar`, `Area`) — mount animations freeze invisible in hidden/throttled tabs (rAF paused) and re-animate on each visit of this force-dynamic page
- House axis style: `axisLine={false} tickLine={false}`, 12px ticks, `tickMargin={10}`, YAxis `width={32}` with explicit `ticks` + `domain` — since F17 these come from the `yAxis` prop (`computeYAxis` in `lib/dashboard-charts.ts`), never hardcoded; grid is horizontal-only dashed (`vertical={false}` `strokeDasharray="4 4"`)
- Bars: `radius={[4, 4, 0, 0]}`; line/area: `type="monotone"` `strokeWidth={3}` `dot={false}` with a `<linearGradient>` fill fading `var(--color-accent)` 0.2 → 0
- Categorical X axes with few buckets must force every label: recharts auto-skip dropped "80-90%" on the six-bucket distribution in its 1/3-width card — `interval={0}` fixes it (live-verified 2026-06-10). Dense time axes (30 daily points) instead thin via `interval="preserveStartEnd"` + `minTickGap={24}`
- No `<Tooltip>`/`<Legend>` — F17 kept the charts static (matches the design; `activeDot={false}` stays on the area chart)

---

## @react-pdf/renderer

**Check first:** Check AGENTS.md for an installed react-pdf skill. PDF generation APIs can differ from general training knowledge.

### Resume PDF Generation

```typescript
import { renderToBuffer } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica' },
  section: { marginBottom: 10 },
  heading: { fontSize: 14, fontWeight: 'bold' },
  text: { fontSize: 10 },
})

const ResumePDF = ({ profile }: { profile: Profile }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.heading}>{profile.fullName}</Text>
        <Text style={styles.text}>{profile.email}</Text>
      </View>
    </Page>
  </Document>
)

// Generate buffer
const buffer = await renderToBuffer(<ResumePDF profile={profile} />)

// Wrap the buffer — upload() accepts File | Blob only, never a raw Buffer
const file = new File([new Uint8Array(buffer)], 'resume.pdf', {
  type: 'application/pdf',
})

// Overwrite strategy: remove then upload (no upsert option exists)
await insforge.storage.from('resumes').remove(`${userId}/resume.pdf`) // ignore error
const { error } = await insforge.storage
  .from('resumes')
  .upload(`${userId}/resume.pdf`, file)
```

**Supported CSS properties:**
Only use these — others are silently ignored:
`padding, margin, fontSize, color, fontFamily, flexDirection, alignItems, justifyContent, borderRadius, width, height, fontWeight, textAlign, lineHeight`

**Rules:**

- Server-side only — never import in client components
- Always use `renderToBuffer` — not `renderToStream` or `PDFDownloadLink`
- PDF generation only in `app/api/resume/` routes or `app/api/jobs/[id]/tailored-resume`
- Generated buffer is wrapped in a `File` and uploaded to InsForge Storage — never written to disk
- Storage upload follows the InsForge section above: `remove` then `upload`, no `upsert` option
- Always save public URL to DB after upload

---

## pdf-parse

**Check first:** Check AGENTS.md for an installed pdf-parse skill.

### Extract Text from Uploaded Resume

```typescript
import pdf from "pdf-parse";

// In API route handling resume upload
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("resume") as File;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const pdfData = await pdf(buffer);
  const extractedText = pdfData.text; // raw text content

  // Send to Gemini for structured extraction
}
```

**Rules:**

- Server-side only — never import in client components
- `pdfData.text` is raw unformatted text — Gemini handles the structure extraction
- Always handle parse errors — some PDFs are image-based and return empty text
- If `pdfData.text` is empty or very short — return error to user: "Could not extract text from this PDF. Please try a different file."
