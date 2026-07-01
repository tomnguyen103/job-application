# Job Search API Setup Guide

This app now supports multiple compliant job sources through one Find Jobs
search. The client request shape stays the same; sources are enabled with
server-side environment variables.

## Current Local Setup

`.env.local` has already been prepared for the new sources:

- `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` already exist. Do not overwrite them.
- `JOB_SOURCE_PROVIDERS=adzuna,remotive,usajobs` is present.
- `USAJOBS_API_KEY=` is present and blank, ready for the USAJOBS key.
- `USAJOBS_USER_AGENT=` is present and blank, ready for the email/user-agent
  you register with USAJOBS.
- `JOB_SOURCE_ATS_BOARDS=` is present and blank. Fill it only when you want to
  query specific company boards.

Remotive needs no key. Greenhouse, Lever, and Ashby do not need app-level keys
for this implementation; they need public board slugs.

## Final Env Shape

Add these to `.env.local` for local development and to Vercel Environment
Variables for deployed environments:

```env
JOB_SOURCE_PROVIDERS=adzuna,remotive,usajobs

# Already present locally:
ADZUNA_APP_ID=your-adzuna-app-id
ADZUNA_APP_KEY=your-adzuna-app-key

# Fill these after USAJOBS approves your API request:
USAJOBS_API_KEY=your-usajobs-authorization-key
USAJOBS_USER_AGENT=your-email@example.com

# Optional company ATS boards. Leave blank until you choose companies:
JOB_SOURCE_ATS_BOARDS=
```

Do not commit real keys. After changing local env vars, restart `npm run dev`.
After changing Vercel env vars, redeploy so the runtime sees the new values.

The PowerShell API smoke tests below read from the current PowerShell process
environment, not automatically from `.env.local`. To load `.env.local` into the
current PowerShell session for testing, run:

```powershell
Get-Content .env.local |
  Where-Object { $_ -match '^[A-Z0-9_]+=' } |
  ForEach-Object {
    $name, $value = $_ -split '=', 2
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
```

## Source Matrix

| Source | Needs API Key? | App Env | What It Searches |
| --- | --- | --- | --- |
| Adzuna | Yes | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Global job ads through Adzuna search |
| Remotive | No | none | Remote jobs from Remotive |
| USAJOBS | Yes | `USAJOBS_API_KEY`, `USAJOBS_USER_AGENT` | US federal jobs |
| Greenhouse | No | `JOB_SOURCE_ATS_BOARDS` | Specific company Greenhouse boards |
| Lever | No | `JOB_SOURCE_ATS_BOARDS` | Specific company Lever boards |
| Ashby | No | `JOB_SOURCE_ATS_BOARDS` | Specific company Ashby boards |

## 1. Adzuna

Use Adzuna if you want broad job search coverage.

1. Go to the [Adzuna Developer Portal](https://developer.adzuna.com/).
2. Register at [Adzuna API signup](https://developer.adzuna.com/signup).
3. After approval/signup, copy the `app_id` and `app_key`.
4. Add:

```env
JOB_SOURCE_PROVIDERS=adzuna,remotive,usajobs
ADZUNA_APP_ID=your-adzuna-app-id
ADZUNA_APP_KEY=your-adzuna-app-key
```

Quick PowerShell test:

```powershell
$params = "app_id=$env:ADZUNA_APP_ID&app_key=$env:ADZUNA_APP_KEY&what=frontend%20engineer&category=it-jobs&results_per_page=1&content-type=application/json"
Invoke-RestMethod "https://api.adzuna.com/v1/api/jobs/us/search/1?$params"
```

Note: the app keeps Adzuna's existing behavior: `category=it-jobs`,
country detection, remote-marker stripping from `where`, and canonical URL
dedupe.

## 2. Remotive

Remotive does not require a key for the public remote jobs endpoint.

1. Keep `remotive` in `JOB_SOURCE_PROVIDERS`.
2. No extra env vars are needed.
3. The app stores Remotive as the source and links back to the Remotive URL.

Quick PowerShell test:

```powershell
Invoke-RestMethod "https://remotive.com/api/remote-jobs?search=frontend%20engineer"
```

Compliance note: Remotive's API page says to mention Remotive as the source and
link back to the Remotive URL. The app's source badge and original-post link are
there for this reason.

## 3. USAJOBS

Use USAJOBS for US federal roles.

1. Open the [USAJOBS Developer Quick Start](https://developer.usajobs.gov/General/Quick-Start).
2. Request an API key from the USAJOBS API request flow linked there.
3. Use the same email address, app name, or contact string as
   `USAJOBS_USER_AGENT`.
4. Paste into the blank fields already added to `.env.local`:

```env
JOB_SOURCE_PROVIDERS=adzuna,remotive,usajobs
USAJOBS_API_KEY=your-authorization-key
USAJOBS_USER_AGENT=your-email@example.com
```

Quick PowerShell test:

```powershell
$headers = @{
  "User-Agent" = $env:USAJOBS_USER_AGENT
  "Authorization-Key" = $env:USAJOBS_API_KEY
}

Invoke-RestMethod -Headers $headers "https://data.usajobs.gov/api/search?Keyword=Software%20Engineer&ResultsPerPage=1"
```

USAJOBS expects the `Authorization-Key` header and a `User-Agent` value that
identifies the caller.

## 4. Greenhouse Boards

Greenhouse is not a global search API in this app. It pulls jobs from specific
company boards.

1. Find a public Greenhouse board URL, for example:
   `https://boards.greenhouse.io/openai`
2. The slug is the path segment after the host: `openai`.
3. Add it to `JOB_SOURCE_ATS_BOARDS`:

```env
JOB_SOURCE_ATS_BOARDS=greenhouse:openai
```

Quick PowerShell test:

```powershell
Invoke-RestMethod "https://boards-api.greenhouse.io/v1/boards/openai/jobs?content=true"
```

## 5. Lever Boards

Lever is also company-board based.

1. Find a public Lever jobs URL, for example:
   `https://jobs.lever.co/anthropic`
2. The slug is `anthropic`.
3. Add it:

```env
JOB_SOURCE_ATS_BOARDS=lever:anthropic
```

Quick PowerShell test:

```powershell
Invoke-RestMethod "https://api.lever.co/v0/postings/anthropic?mode=json"
```

## 6. Ashby Boards

Ashby is company-board based.

1. Find a public Ashby jobs URL, for example:
   `https://jobs.ashbyhq.com/posthog`
2. The slug is `posthog`.
3. Add it:

```env
JOB_SOURCE_ATS_BOARDS=ashby:posthog
```

Quick PowerShell test:

```powershell
Invoke-RestMethod "https://api.ashbyhq.com/posting-api/job-board/posthog"
```

Ashby's public Job Postings API can also include compensation data when the
provider exposes it, but this app currently keeps salary handling conservative
for Ashby rows.

## Multiple ATS Boards

Use commas:

```env
JOB_SOURCE_ATS_BOARDS=greenhouse:openai,lever:anthropic,ashby:posthog
```

These boards are useful only for companies you explicitly configure. They do
not search all Greenhouse, Lever, or Ashby customers globally.

Recommended first ATS test values:

```env
JOB_SOURCE_ATS_BOARDS=greenhouse:openai,lever:anthropic,ashby:posthog
```

Replace those examples with companies you actually want the app to monitor.
Leaving examples in place will query those companies on every Find Jobs run.

## Sources Not Enabled in V1

Do not spend time trying to add direct LinkedIn, Indeed, or Glassdoor public
search keys for this V1. Their official/public routes are partner-gated,
commercial, deprecated, or not a general public job-search API. Keep them out
unless you obtain a compliant partner agreement or choose a paid aggregator.

## Local Verification Flow

1. Update `.env.local`.
2. Restart the dev server.
3. Run:

```powershell
npm run test
npm run lint
npm run build
```

4. In the app, run Find Jobs with a title like `Frontend Engineer`.
5. Confirm the success banner shows per-source counts.
6. Confirm saved jobs show source badges in Find Jobs and on the job detail
   header.

## Official References

- [Adzuna API](https://developer.adzuna.com/)
- [Adzuna API signup](https://developer.adzuna.com/signup)
- [Remotive API](https://remotive.com/remote-jobs/api)
- [USAJOBS Quick Start](https://developer.usajobs.gov/General/Quick-Start)
- [USAJOBS Authentication](https://developer.usajobs.gov/Guides/Authentication)
- [Greenhouse Job Board API](https://developers.greenhouse.io/job-board.html)
- [Lever Postings API](https://github.com/lever/postings-api)
- [Ashby Public Job Posting API](https://developers.ashbyhq.com/docs/public-job-posting-api)
