-- Feature 18 - Job-tailored resume metadata
-- Temporary job-scoped PDFs live in the private tailored-resumes storage bucket.
-- NOTE: migrations run inside a backend-managed transaction - no BEGIN/COMMIT here.

CREATE TABLE tailored_resumes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id       uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  storage_key  text NOT NULL,
  storage_url  text NOT NULL,
  file_name    text NOT NULL DEFAULT 'tailored-resume.pdf',
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  CONSTRAINT tailored_resumes_expires_after_generated CHECK (expires_at > generated_at)
);

CREATE INDEX idx_tailored_resumes_user_job_generated
  ON tailored_resumes (user_id, job_id, generated_at DESC);

CREATE INDEX idx_tailored_resumes_expires_at
  ON tailored_resumes (expires_at);

ALTER TABLE tailored_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tailored_resumes_select_own
  ON tailored_resumes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY tailored_resumes_insert_own
  ON tailored_resumes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY tailored_resumes_update_own
  ON tailored_resumes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY tailored_resumes_delete_own
  ON tailored_resumes FOR DELETE
  USING (user_id = auth.uid());
