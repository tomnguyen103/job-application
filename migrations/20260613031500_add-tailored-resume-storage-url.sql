-- Feature 18 - Persist tailored resume storage URLs for already-created tables.
-- NOTE: migrations run inside a backend-managed transaction - no BEGIN/COMMIT here.

ALTER TABLE tailored_resumes
  ADD COLUMN IF NOT EXISTS storage_url text;

UPDATE tailored_resumes
SET storage_url =
  'https://wgg8j33p.us-east.insforge.app/api/storage/buckets/tailored-resumes/objects/'
  || replace(storage_key, '/', '%2F')
WHERE storage_url IS NULL;

ALTER TABLE tailored_resumes
  ALTER COLUMN storage_url SET NOT NULL;
