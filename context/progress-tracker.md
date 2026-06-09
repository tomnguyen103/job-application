# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 2 - Profile Page
**Last completed:** 04 Database Schema
**Next:** 05 Profile Page - Full UI

---

## Progress

### Phase 1 - Foundation

- [x] 01 Homepage
- [x] 02 Auth
- [x] 03 PostHog Initialization
- [x] 04 Database Schema

### Phase 2 - Profile Page

- [ ] 05 Profile Page - Full UI
- [ ] 06 Profile Save Logic
- [ ] 07 AI Profile Extraction from Resume
- [ ] 08 Resume PDF Generation from Profile

### Phase 3 - Find Jobs Page

- [ ] 09 Find Jobs Page - Full UI
- [ ] 10 Adzuna Job Discovery
- [ ] 11 Filter + Sort + Pagination

### Phase 4 - Job Details Page

- [ ] 12 Job Details Page - Full UI
- [ ] 13 Company Research Agent

### Phase 5 - Dashboard

- [ ] 14 Dashboard Page - Full UI
- [ ] 15 Stats Bar - Real Data
- [ ] 16 Recent Activity - Real Data
- [ ] 17 Analytics Charts - PostHog Data

---

## Decisions Made During Build

- 2026-06-08: Built Feature 01 as a static App Router homepage matching `context/designs/landing-page.png`, using the provided public assets for the logo, dashboard preview, jobs list, agent log, and testimonial avatar.
- 2026-06-08: Primary and header Get Started links point to `/login`; Find Your First Match links point to `/find-jobs` until auth-aware routing is implemented in Feature 02.
- 2026-06-08: Built Feature 02 with InsForge OAuth for Google and GitHub using `@insforge/sdk/ssr`, server-side PKCE callback exchange, `/api/auth/refresh`, and Next.js 16 `proxy.ts` route protection.
- 2026-06-08: Applied InsForge auth redirect config for local OAuth callbacks: `http://localhost:3000/api/auth/callback` and `http://127.0.0.1:3000/api/auth/callback`.
- 2026-06-08: Added minimal protected workspace shells for `/dashboard`, `/profile`, and `/find-jobs` so post-login redirects and auth protection have concrete route targets.
- 2026-06-08: Tightened Feature 02 after review: OAuth provider buttons now render only from live InsForge public auth config, the login page shows a safe unavailable state when no supported providers are enabled, and OAuth submissions show a pending state.
- 2026-06-08: Built Feature 03 with guarded PostHog browser/server initialization, manual pageview capture, typed helpers for the four approved product events, and client-side identity sync after OAuth login/signout.
- 2026-06-09: Fixed the Feature 03 review finding on logout identity reset. Added `components/layout/SignOutButton.tsx` — a small client component that calls `resetPostHog()` on click before submitting the existing `signOut` server action. This resets PostHog identity immediately on logout instead of relying on the mount-only effect in `PostHogProvider.tsx`, which does not re-run on the soft navigation triggered by the `signOut` redirect. `Navbar.tsx` stays a Server Component. `npm run lint` and `npm run build` pass.
- 2026-06-09: Built Feature 04 (Database Schema) via InsForge CLI migration `migrations/20260609064130_create-core-schema.sql`, applied with `db migrations up --all`. Created `profiles`, `agent_runs`, `jobs`, `agent_logs` with columns per architecture.md. 16 RLS policies (SELECT/INSERT/UPDATE/DELETE × 4 tables), owner-scoped: `profiles` on `id = auth.uid()`, the other three on `user_id = auth.uid()`. Verified tables, policies, and indexes against the live backend.
- 2026-06-09: FK targets — all `user_id` columns and `profiles.id` reference `auth.users(id)` with `ON DELETE CASCADE` (InsForge convention from AGENTS.md/skill: FK to `auth.users(id)`, `auth.uid()` in RLS), not `profiles`. Avoids a creation-order dependency and matches the platform.
- 2026-06-09: Enforced documented invariants as CHECK constraints — `source` ('search'|'url'), `agent_runs.status`, `agent_logs.level`, the profile dropdowns (`experience_level`, `remote_preference`, `cover_letter_tone`, `work_authorization`, NULL-allowed since the profile starts empty), and `match_score` 0–100.
- 2026-06-09: DEVIATION from the confirmed plan — left `jobs.job_type` as free text (no CHECK). Adzuna's `contract_type` vocabulary (e.g. `permanent`) does not match the documented `fulltime/parttime/contract` enum and library-docs.md maps it straight through; a CHECK would break Feature 10 ingestion. The "tailored fields" from the build plan were excluded (out of scope; not in architecture.md schema).
- 2026-06-09: No signup trigger — the `profiles` row is created by upsert on first save (Feature 06). Feature 04 is structure-only; `updated_at` is set by the save action, not a DB trigger. Indexes added for known access patterns: `jobs(user_id, match_score DESC)`, `jobs(user_id, found_at DESC)`, `jobs(run_id)`, `agent_runs(user_id, started_at DESC)`, `agent_logs(run_id)`, `agent_logs(user_id)`.
- 2026-06-09: Created private `resumes` storage bucket (`public=false`). InsForge storage authorization is API-level (bucket public/private + `storage.objects.uploaded_by`), NOT Postgres RLS — `storage.objects` ships with RLS disabled, zero policies, and there is no storage-policy CLI command. Did NOT add RLS to `storage.objects` (would fight the platform and risk breaking storage). Own-files isolation = private bucket + per-user path `resumes/{user_id}/resume.pdf` + server-side access scoped to the current user. Feature 06 must always use the current user's id in the storage path and never a user-supplied path.

---

## Notes

- Homepage uses Inter via `next/font/google` in `app/layout.tsx`, matching `ui-rules.md`.
- Added explicit token utility aliases in `app/globals.css` for project color classes such as `text-accent-foreground` and `text-text-dark`, because the browser render did not reliably resolve every multi-part Tailwind v4 token class from `@theme` alone.
- Local runtime env values were written to ignored `.env.local` for `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL`.
- Auth uses Next.js 16 `proxy.ts`; do not add `middleware.ts` for this project.
- Local runtime env includes `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`; helpers no-op with development warnings when either value is absent.
- Database schema is managed via InsForge CLI migrations in `migrations/`. Create with `npx @insforge/cli db migrations new <name>`, apply with `npx @insforge/cli db migrations up --all`. Migrations run inside a backend-managed transaction — never put `BEGIN`/`COMMIT` in a migration file. FK to users via `auth.users(id)`; use `auth.uid()` in RLS.
- `ui-registry.md` was intentionally not updated for Feature 04 — it is a backend-only feature with no UI component to register.
- Feature 04 RLS is structurally verified (correct `USING`/`WITH CHECK` on all 16 policies). It will be functionally exercised when the app first writes as a real authenticated user in Feature 06 — the InsForge server client uses the user's cookie session, so RLS applies (the admin CLI key bypasses RLS).
