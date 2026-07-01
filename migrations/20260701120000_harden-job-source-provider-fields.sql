-- Hardening pass on 20260629143000_add-job-source-provider-fields.sql, applied
-- after review: drop the temporary backfill defaults now that all rows have
-- been migrated, and add a uniqueness backstop for job dedupe.

-- Every insert path (agent/job-discovery.ts's saveJob) already sets both
-- columns explicitly. Keeping a permanent default would let a future insert
-- that forgets to set them silently mislabel a job as Adzuna instead of
-- failing loudly.
ALTER TABLE jobs
ALTER COLUMN source_provider DROP DEFAULT,
ALTER COLUMN source_display_name DROP DEFAULT;

-- Backstop for agent/job-discovery.ts's application-level dedupe: two
-- concurrent runs racing loadExistingRows before either has inserted could
-- otherwise save the same provider job twice. Not CONCURRENTLY — InsForge
-- runs each migration inside a backend-managed transaction, and
-- CREATE INDEX CONCURRENTLY cannot run inside one; a brief lock is an
-- acceptable tradeoff at current table size.
CREATE UNIQUE INDEX uq_jobs_user_source_provider_job_id
ON jobs (user_id, source_provider, source_provider_job_id)
WHERE source_provider_job_id IS NOT NULL;
