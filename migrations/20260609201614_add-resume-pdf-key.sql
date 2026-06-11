-- Add resume_pdf_key alongside resume_pdf_url (InsForge guidance: persist both
-- the display url and the storage key; the key is what download/delete use).
-- No BEGIN/COMMIT — migrations run inside a backend-managed transaction.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_pdf_key text;
