-- Feature 04 — Core database schema for JobApplication
-- Tables: profiles, agent_runs, jobs, agent_logs
-- Owner-scoped RLS on all four. FKs to auth.users(id); auth.uid() in policies.
-- NOTE: migrations run inside a backend-managed transaction — no BEGIN/COMMIT here.

-- ============================================================
-- profiles — one row per auth user; id IS the auth user id
-- ============================================================
CREATE TABLE profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           text,
  email               text,
  phone               text,
  location            text,
  current_title       text,
  experience_level    text CHECK (experience_level IS NULL OR experience_level IN ('junior','mid','senior','lead')),
  years_experience    integer,
  skills              text[]  NOT NULL DEFAULT '{}',
  industries          text[]  NOT NULL DEFAULT '{}',
  work_experience     jsonb   NOT NULL DEFAULT '[]'::jsonb,
  education           jsonb   NOT NULL DEFAULT '{}'::jsonb,
  job_titles_seeking  text[]  NOT NULL DEFAULT '{}',
  remote_preference   text CHECK (remote_preference IS NULL OR remote_preference IN ('remote','onsite','hybrid','any')),
  preferred_locations text[]  NOT NULL DEFAULT '{}',
  salary_expectation  text,
  cover_letter_tone   text CHECK (cover_letter_tone IS NULL OR cover_letter_tone IN ('formal','casual','enthusiastic')),
  linkedin_url        text,
  portfolio_url       text,
  work_authorization  text CHECK (work_authorization IS NULL OR work_authorization IN ('citizen','permanent_resident','visa_required')),
  resume_pdf_url      text,
  is_complete         boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- agent_runs — one row per job-search run
-- ============================================================
CREATE TABLE agent_runs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status             text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  job_title_searched text,
  location_searched  text,
  jobs_found         integer NOT NULL DEFAULT 0,
  started_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz
);

-- ============================================================
-- jobs — discovered + scored jobs (and their company research)
-- job_type is intentionally free text (no CHECK): Adzuna's contract_type
-- vocabulary does not match the documented enum, and library-docs maps it
-- straight through — a CHECK would break Feature 10 ingestion.
-- ============================================================
CREATE TABLE jobs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id             uuid REFERENCES agent_runs(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source             text NOT NULL CHECK (source IN ('search','url')),
  source_url         text,
  external_apply_url text,
  title              text,
  company            text,
  location           text,
  salary             text,
  job_type           text,
  about_role         text,
  responsibilities   text[] NOT NULL DEFAULT '{}',
  requirements       text[] NOT NULL DEFAULT '{}',
  nice_to_have       text[] NOT NULL DEFAULT '{}',
  benefits           text[] NOT NULL DEFAULT '{}',
  about_company      text,
  match_score        integer CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100)),
  match_reason       text,
  matched_skills     text[] NOT NULL DEFAULT '{}',
  missing_skills     text[] NOT NULL DEFAULT '{}',
  company_research   jsonb,
  found_at           timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- agent_logs — human-readable run log entries
-- ============================================================
CREATE TABLE agent_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     uuid REFERENCES agent_runs(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message    text NOT NULL,
  level      text NOT NULL DEFAULT 'info' CHECK (level IN ('info','success','warning','error')),
  job_id     uuid REFERENCES jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes — for the known access patterns (Features 11, 15, 16)
-- Composite (user_id, sort_col) also serves user-only filters via prefix.
-- ============================================================
CREATE INDEX idx_jobs_user_match ON jobs (user_id, match_score DESC);
CREATE INDEX idx_jobs_user_found ON jobs (user_id, found_at DESC);
CREATE INDEX idx_jobs_run_id     ON jobs (run_id);
CREATE INDEX idx_agent_runs_user ON agent_runs (user_id, started_at DESC);
CREATE INDEX idx_agent_logs_run  ON agent_logs (run_id);
CREATE INDEX idx_agent_logs_user ON agent_logs (user_id);

-- ============================================================
-- Row Level Security — every row scoped to its owning user.
-- profiles is scoped on id (id IS the auth user); the rest on user_id.
-- ============================================================
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_delete_own ON profiles FOR DELETE USING (id = auth.uid());

-- agent_runs
CREATE POLICY agent_runs_select_own ON agent_runs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY agent_runs_insert_own ON agent_runs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY agent_runs_update_own ON agent_runs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY agent_runs_delete_own ON agent_runs FOR DELETE USING (user_id = auth.uid());

-- jobs
CREATE POLICY jobs_select_own ON jobs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY jobs_insert_own ON jobs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY jobs_update_own ON jobs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY jobs_delete_own ON jobs FOR DELETE USING (user_id = auth.uid());

-- agent_logs
CREATE POLICY agent_logs_select_own ON agent_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY agent_logs_insert_own ON agent_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY agent_logs_update_own ON agent_logs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY agent_logs_delete_own ON agent_logs FOR DELETE USING (user_id = auth.uid());
