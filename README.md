# JobApplication

**An AI-powered job hunting assistant.** Set up your profile once, upload your resume, and let the agent discover relevant jobs, score them against your actual skills, and research each company before you apply.

![Dashboard preview](public/images/dashboard-demo2.png)

## Why

Job hunting is repetitive: reading dozens of descriptions, judging fit, researching every company from scratch — all before clicking apply. JobApplication does that preparation for you. The agent finds the jobs, scores them intelligently against your profile, and builds a research dossier for each company, so you arrive at every application fully informed. You decide where to apply.

## Features

### 🔍 Job Discovery & Matching
- Search tech jobs by title and location via the **Adzuna API**
- **Gemini 2.5 Flash** scores every job 0–100 against your profile, with a written match reason plus matched / missing skill tags
- Filter (high/low match), sort (score, newest, oldest), and paginate the full results list

### 🕵️ Company Research Agent
- One click launches a **Browserbase + Stagehand** browser session that visits the company's homepage, About, Blog, and Engineering pages
- Gemini synthesizes the findings into a structured dossier: company overview, tech stack, culture, why the role exists, your edge, gaps to address, smart questions, and interview prep
- Tech-stack claims are filtered to evidence actually found in the research or the job posting
- Falls back gracefully when a company has little or no web presence

### 📄 Profile & Resume Pipeline
- Full profile form covering standard resume fields, work experience, and education
- Upload a resume PDF and optionally **auto-fill the profile** with AI extraction
- **Generate a clean, professional PDF resume** from your profile data (`@react-pdf/renderer`)
- Completion indicator shows exactly which fields are missing

### 📊 Dashboard
- Stats bar: total jobs found, average match rate, companies researched, jobs this week
- Recent activity feed of your latest searches and research runs
- **PostHog-powered analytics**: jobs found over time, match-score distribution, and research activity charts

## How It Works

1. **Sign in** with Google or GitHub (InsForge auth)
2. **Complete your profile** — fill the form, or upload your resume and let the AI extract it
3. **Find jobs** — enter a title and location; the agent searches Adzuna and scores each result against your profile
4. **Review a job** — structured description, match breakdown, and one-click company research
5. **Apply** — the Apply button opens the original posting; you stay in control

The agent never modifies your profile and research never affects match scores — your data only changes when you edit it.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS v4 with a token-based design system |
| Backend (BaaS) | [InsForge](https://insforge.dev) — Postgres, auth (Google/GitHub OAuth), file storage |
| AI | Google **Gemini 2.5 Flash** (`@google/genai`) — matching, extraction, generation, research synthesis |
| Browser automation | [Browserbase](https://browserbase.com) + [Stagehand](https://stagehand.dev) |
| Job data | [Adzuna API](https://developer.adzuna.com/) |
| Analytics | [PostHog](https://posthog.com) (client + server events, HogQL dashboard queries) |
| PDF | `@react-pdf/renderer` |
| Validation | Zod |

## Getting Started

### Prerequisites

- Node.js 20+
- Accounts/keys for: InsForge, Google AI Studio (Gemini), Adzuna, Browserbase, PostHog

### Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment** — create `.env.local` in the project root:

   | Variable | Purpose |
   | --- | --- |
   | `NEXT_PUBLIC_INSFORGE_URL` | InsForge project API base URL |
   | `NEXT_PUBLIC_INSFORGE_ANON_KEY` | InsForge anonymous (publishable) key |
   | `NEXT_PUBLIC_APP_URL` | App origin, e.g. `http://localhost:3000` (OAuth redirects) |
   | `GEMINI_API_KEY` | Google Gemini API key |
   | `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Adzuna API credentials |
   | `BROWSERBASE_API_KEY` / `BROWSERBASE_PROJECT_ID` | Browserbase session credentials |
   | `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | PostHog event ingestion |
   | `POSTHOG_PERSONAL_API_KEY` / `POSTHOG_PROJECT_ID` / `POSTHOG_API_HOST` | PostHog Query API (dashboard charts) |

   > Never commit `.env.local` — it is gitignored.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Node test runner via `tsx`) |

## Project Structure

```
app/                  Routes (App Router)
├── (auth)/login      Auth page (Google + GitHub OAuth)
├── dashboard/        Stats, activity feed, analytics charts
├── find-jobs/        Search + paginated job list, job details ([id])
├── profile/          Profile form and resume management
└── api/
    ├── agent/        find (discovery + scoring), research (company dossier)
    ├── resume/       extract, generate, download
    └── auth/         OAuth callback, session refresh
agent/                AI agent logic (Adzuna search, matcher, extractor,
                      generator, company research, shared Gemini client)
actions/              Server actions (profile save, resume upload)
components/           UI components by feature (dashboard, find-jobs,
                      job-details, profile, layout, homepage)
lib/                  Integrations & helpers (InsForge, Adzuna, Browserbase,
                      Stagehand, PostHog, dashboard data, utils)
migrations/           SQL migrations for the InsForge Postgres database
tests/                Unit tests for research and dashboard helpers
types/                Shared TypeScript types
context/              Project design docs (architecture, UI tokens, standards)
```

## Routes

| Route | Description |
| --- | --- |
| `/` | Homepage (logged-in users are redirected to the dashboard) |
| `/login` | Google + GitHub OAuth sign-in |
| `/dashboard` | Stats, recent activity, analytics |
| `/find-jobs` | Search controls + full jobs list |
| `/find-jobs/[id]` | Job details, match breakdown, company research |
| `/profile` | Profile form + resume upload/generation |

## Data Model Notes

- **`profiles`** — your profile is the single source of truth for matching; it changes only when you edit it or apply a resume extraction
- **`jobs`** — discovered jobs with structured fields, match data, and a `company_research` JSONB dossier per job
- All tables are protected with row-level security scoped to the authenticated user

## Testing

```bash
npm test
```

Unit tests cover the company-research URL trust rules, tech-stack evidence filtering, and the dashboard stats/charts/activity helpers.

---

Job listings powered by [Adzuna](https://www.adzuna.com/). Built with [Claude Code](https://claude.com/claude-code).
