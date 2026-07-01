ALTER TABLE jobs
ADD COLUMN source_provider text NOT NULL DEFAULT 'adzuna',
ADD COLUMN source_display_name text NOT NULL DEFAULT 'Adzuna',
ADD COLUMN source_provider_job_id text,
ADD COLUMN posted_at timestamptz,
ADD COLUMN source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE jobs
SET
  source_provider = 'manual',
  source_display_name = 'Manual import'
WHERE source = 'url';

UPDATE jobs
SET
  source_provider = 'adzuna',
  source_display_name = 'Adzuna',
  source_provider_job_id = COALESCE(NULLIF(source_provider_job_id, ''), source_url)
WHERE source = 'search';

ALTER TABLE jobs
ADD CONSTRAINT chk_jobs_source_provider
CHECK (
  source_provider IN (
    'adzuna',
    'remotive',
    'usajobs',
    'greenhouse',
    'lever',
    'ashby',
    'manual'
  )
);

ALTER TABLE jobs
ADD CONSTRAINT chk_jobs_source_metadata_object
CHECK (jsonb_typeof(source_metadata) = 'object');

CREATE INDEX idx_jobs_user_source_provider
ON jobs (user_id, source_provider, source_provider_job_id);

CREATE INDEX idx_jobs_user_posted_at
ON jobs (user_id, posted_at DESC);
