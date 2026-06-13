# Memory - Feature 18 Docs-First Tailored Resume Plan

Last updated: 2026-06-12 17:56 -05:00

## What was built

Documentation-only Feature 18 planning was added across the required context files:

- `context/project-overview.md`
- `context/architecture.md`
- `context/ui-tokens.md`
- `context/ui-rules.md`
- `context/ui-registry.md`
- `context/code-standards.md`
- `context/library-docs.md`
- `context/build-plan.md`
- `context/progress-tracker.md`

The planned feature is a job-detail tailored resume flow. It adds a Generate Tailored Resume action on the Job Details page, creates a job-specific ATS-simple PDF from the saved profile and saved job row, stores it temporarily in InsForge Storage plus a `tailored_resumes` metadata row, and expires it after 15 days. The Profile page Generate Resume button and active base resume flow remain unchanged.

## Decisions made

- Use Gemini only for app AI calls. Do not add OpenAI, `openai`, GPT-4o, or `OPENAI_API_KEY`.
- Gemini calls should use `@google/genai`, `agent/gemini.ts`, and `GEMINI_API_KEY`.
- Tailored resumes are temporary generated files, separate from the profile resume at `resumes/{user_id}/resume.pdf`.
- Job-tailored PDFs should live under `tailored-resumes/{user_id}/{job_id}/{resume_id}.pdf`.
- `tailored_resumes.expires_at` is 15 days after generation.
- Download routes must verify both `jobs.user_id` and `tailored_resumes.user_id` match the current user.
- Expired tailored resumes must not be downloadable.
- Scheduled cleanup should delete expired storage objects first, then delete their DB rows.
- Saved Adzuna descriptions may be snippets, so the tailored resume agent must stay grounded and avoid overstating job-specific details.

## Problems solved

- Removed the conflicting project-overview out-of-scope item for "Resume tailoring per job."
- Replaced stale GPT-4o/OpenAI guidance in active context docs with Gemini 2.5 Flash guidance.
- Cleaned up validation terms so `GPT-4o`, `OPENAI_API_KEY`, `openai`, `OpenAI`, `Resume tailoring per job`, and ambiguous `one active resume` no longer appear in `context/`.
- Moved the 2026-06-12 Feature 18 decision note in `progress-tracker.md` to preserve chronological order.
- Clarified that one-active-resume language applies only to the profile base resume.

## Current state

This is still a docs-first step only. Feature 18 is planned/in-progress in the docs but not implemented.

Validation run:

- `rg -n "GPT-4o|OPENAI_API_KEY|openai|OpenAI|Resume tailoring per job|one active resume" context` returned no matches.
- `git diff --check` passed with only Git CRLF warnings on markdown files.

Working tree state at save time:

- Modified: the nine context files listed above.
- Untracked and left untouched: `stdout.log`, `stderr.log`.

## Next session starts with

Start implementation of Feature 18 only after confirming the docs-first plan is accepted. Begin by reading AGENTS.md and the nine required context files in order, then implement the vertical slice:

1. Add InsForge migration/schema for `tailored_resumes`.
2. Add storage bucket/path and cleanup schedule/function.
3. Add `agent/tailored-resume.ts` using Gemini via `agent/gemini.ts`.
4. Add job-details API routes for generate and download with strict ownership and expiration checks.
5. Add the Job Details UI action states: idle, generating, ready/download, expired, error.
6. Verify with lint/build/tests and update `progress-tracker.md` plus `ui-registry.md`.

## Open questions

- Whether to stage/commit the docs-first changes before implementation.
- Exact cleanup mechanism may depend on the preferred InsForge schedule/function setup available in the local project.
