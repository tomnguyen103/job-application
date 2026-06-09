# Memory — Feature 04 Database Schema

Last updated: 2026-06-09

## What was built

Feature 04 (Database Schema) — the full InsForge backend structure, applied to the live **JobApplication** backend (project `c7436b18-4e12-4e58-bbba-32528cfd1023`, host `https://wgg8j33p.us-east.insforge.app`).

- InsForge CLI authenticated, project linked, agent skills installed. `.insforge/project.json` written (gitignored — holds the full-access admin `api_key`).
- Migration `migrations/20260609064130_create-core-schema.sql` created via `npx @insforge/cli db migrations new` and applied with `db migrations up --all`.
- Four tables — `profiles`, `agent_runs`, `jobs`, `agent_logs` — columns exactly per `context/architecture.md`.
- **16 RLS policies** (SELECT/INSERT/UPDATE/DELETE × 4), owner-scoped: `profiles` on `id = auth.uid()`, the other three on `user_id = auth.uid()`.
- 6 indexes for known access patterns (composite `user_id`+sort) + primary keys.
- Private `resumes` storage bucket (`public=false`).
- `context/progress-tracker.md` updated — Feature 04 marked done, decisions + deviations recorded, next = Feature 05.

## Decisions made

- **FK targets:** all `user_id` columns and `profiles.id` reference `auth.users(id)` with `ON DELETE CASCADE` (InsForge convention), NOT `profiles`. Avoids a creation-order dependency.
- **Invariants as CHECK constraints:** `source` ('search'|'url'), `agent_runs.status`, `agent_logs.level`, profile dropdowns (`experience_level`, `remote_preference`, `cover_letter_tone`, `work_authorization` — NULL allowed), `match_score` 0–100.
- **DEVIATION — `jobs.job_type` is free text (no CHECK).** Adzuna's `contract_type` (e.g. `permanent`) doesn't match the documented `fulltime/parttime/contract` enum and `library-docs.md` maps it straight through; a CHECK would break Feature 10 ingestion.
- **"tailored fields" excluded** (out of scope per project-overview; not in architecture.md schema).
- **No signup trigger** — `profiles` row is upserted on first save (Feature 06). Schema is behavior-free; `updated_at` set by the save action, not a trigger.
- Schema managed via versioned InsForge CLI migrations in `migrations/`.

## Problems solved

- **InsForge storage is NOT Postgres-RLS-based.** `storage.objects` ships with RLS disabled, zero policies, and there's no storage-policy CLI command — InsForge enforces storage access at its API layer (bucket public/private flag + `storage.objects.uploaded_by`). Do NOT enable RLS / add policies on `storage.objects` — it fights the platform and risks breaking storage. Own-files isolation = private bucket + per-user path `resumes/{user_id}/resume.pdf` + server-side access scoped to the current user.
- **CLI invocation:** run as `npx --yes @insforge/cli ...` — the `--yes` to npx stops the install prompt hanging the non-interactive shell. Destructive/confirm subcommands also take `-y`/`--yes`.
- Migrations run inside a **backend-managed transaction** — never put `BEGIN`/`COMMIT` in a migration file.
- FK to users via `auth.users(id)`; use `auth.uid()` in RLS.
- The InsForge **server client** (`createInsforgeServer()`, cookie session) operates as the user, so RLS applies. The **admin CLI key bypasses RLS** — so RLS is only functionally exercised by app writes, not the CLI.
- Verified `.insforge/project.json` (admin key) and `.env.local` are gitignored — no secrets will be committed.

## Current state

- Backend was a clean slate before this session (no tables/buckets/migrations). Feature 04 now complete and **verified against the live backend**: 4 tables, 16 policies, 6 indexes, private `resumes` bucket all confirmed present.
- Features 01–03 (Homepage, Auth, PostHog) were already done before this session.
- **Uncommitted:** new `migrations/` file + `context/progress-tracker.md`, on top of pre-existing uncommitted work from earlier sessions (app/, actions/, components/, lib/, context/, etc.). Nothing was committed this session.

## Next session starts with

Resolve the open commit question (below), then start **Feature 05 — Profile Page (Full UI)** per `context/build-plan.md`: build the complete profile page UI with **mock data only, no save logic**. Components under `components/profile/` (`ProfileForm`, `ResumeUpload`, `ResumePreview`, `CompletionIndicator`) per architecture.md. Obey UI rules — no hardcoded hex / raw Tailwind colors, use tokens. Run `/imprint` after building the UI component.

If committing Feature 04 first: per the global CodeRabbit workflow, branch off `main`, stage **only** `migrations/20260609064130_create-core-schema.sql` + `context/progress-tracker.md`, open as a **draft** PR. Never stage `.insforge/` or `.env.local`.

## Watch out for (future features)

- **Feature 06 (Profile Save):** build the storage path from the authenticated user's id (`resumes/{user_id}/resume.pdf`) — never a client-supplied path. This is where RLS first gets functionally exercised; confirm a real user write passes the policies.
- **Feature 10 (Adzuna):** `job_type` is free text by design — raw `contract_type` is fine.

## Open questions

- Commit Feature 04 now (draft PR on a branch) or proceed straight to Feature 05? Asked at end of session, awaiting the developer's answer.
