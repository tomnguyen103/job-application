-- Feature 16: Recent Activity needs a real research timestamp to merge
-- run and research entries chronologically. Backfill uses found_at — the
-- only timestamp existing dossier rows have.
ALTER TABLE jobs ADD COLUMN researched_at timestamptz;

UPDATE jobs
SET researched_at = found_at
WHERE company_research IS NOT NULL
  AND researched_at IS NULL;
