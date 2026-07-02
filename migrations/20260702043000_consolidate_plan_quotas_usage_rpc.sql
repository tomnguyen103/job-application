-- Consolidate billing quotas into public.plan_quotas and restate the
-- canonical 10-argument usage RPC. lib/billing/plans.ts is the TypeScript
-- mirror; tests assert these seeded rows stay in sync.

CREATE TABLE IF NOT EXISTS public.plan_quotas (
  plan_key text NOT NULL,
  event_type text NOT NULL,
  quota_limit integer NOT NULL,
  display_name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_key, event_type),
  CONSTRAINT chk_plan_quotas_plan_key CHECK (plan_key IN ('free', 'pro')),
  CONSTRAINT chk_plan_quotas_event_type CHECK (
    event_type IN (
      'job_search_run',
      'job_match_score',
      'company_research_run',
      'tailored_resume_generate',
      'base_resume_generate',
      'resume_extract'
    )
  ),
  CONSTRAINT chk_plan_quotas_limit CHECK (quota_limit > 0)
);

ALTER TABLE public.plan_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_quotas_select_authenticated ON public.plan_quotas;

CREATE POLICY plan_quotas_select_authenticated
  ON public.plan_quotas FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.plan_quotas (
  plan_key,
  event_type,
  quota_limit,
  display_name
) VALUES
  ('free', 'job_search_run', 3, 'Job searches'),
  ('free', 'job_match_score', 30, 'AI-scored job matches'),
  ('free', 'company_research_run', 2, 'Company research runs'),
  ('free', 'tailored_resume_generate', 2, 'Job-tailored resumes'),
  ('free', 'base_resume_generate', 2, 'Base resume generations'),
  ('free', 'resume_extract', 2, 'Resume extractions'),
  ('pro', 'job_search_run', 50, 'Job searches'),
  ('pro', 'job_match_score', 500, 'AI-scored job matches'),
  ('pro', 'company_research_run', 25, 'Company research runs'),
  ('pro', 'tailored_resume_generate', 30, 'Job-tailored resumes'),
  ('pro', 'base_resume_generate', 10, 'Base resume generations'),
  ('pro', 'resume_extract', 10, 'Resume extractions')
ON CONFLICT (plan_key, event_type) DO UPDATE SET
  quota_limit = EXCLUDED.quota_limit,
  display_name = EXCLUDED.display_name,
  updated_at = now();

DROP FUNCTION IF EXISTS public.record_usage_with_quota_check(
  uuid,
  text,
  integer,
  text,
  text,
  uuid,
  jsonb
);

DROP FUNCTION IF EXISTS public.record_usage_with_quota_check(
  uuid,
  text,
  integer,
  integer,
  timestamptz,
  timestamptz,
  text
);

CREATE OR REPLACE FUNCTION public.record_usage_with_quota_check(
  p_user_id uuid,
  p_event_type text,
  p_quantity integer,
  p_idempotency_key text,
  p_limit integer DEFAULT NULL,
  p_period_start timestamptz DEFAULT NULL,
  p_period_end timestamptz DEFAULT NULL,
  p_source_route text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb AS $$
DECLARE
  v_current_usage bigint := 0;
  v_current_period_end timestamptz;
  v_current_period_start timestamptz;
  v_period_end timestamptz;
  v_period_start timestamptz;
  v_plan_key text := 'free';
  v_status text := 'active';
  v_limit bigint;
  v_already_exists boolean := false;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'status', 'unauthorized');
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_quantity');
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_idempotency_key');
  END IF;

  SELECT
    ue.plan_key,
    ue.status,
    ue.current_period_start,
    ue.current_period_end
  INTO
    v_plan_key,
    v_status,
    v_current_period_start,
    v_current_period_end
  FROM public.user_entitlements ue
  WHERE ue.user_id = p_user_id;

  IF v_plan_key IS NULL OR v_plan_key NOT IN ('free', 'pro') THEN
    v_plan_key := 'free';
  END IF;

  IF v_plan_key = 'pro'
    AND v_current_period_end IS NOT NULL
    AND now() > v_current_period_end + interval '3 days'
    AND v_status IN ('past_due', 'canceled', 'unpaid') THEN
    v_plan_key := 'free';
  END IF;

  IF v_plan_key = 'pro'
    AND v_current_period_start IS NOT NULL
    AND v_current_period_end IS NOT NULL
    AND v_current_period_start < v_current_period_end THEN
    v_period_start := v_current_period_start;
    v_period_end := v_current_period_end;
  ELSE
    v_period_start := date_trunc('month', now());
    v_period_end := v_period_start + interval '1 month';
  END IF;

  SELECT pq.quota_limit::bigint INTO v_limit
  FROM public.plan_quotas pq
  WHERE pq.plan_key = v_plan_key
    AND pq.event_type = p_event_type;

  IF v_limit IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_event_type');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT EXISTS(
    SELECT 1 FROM public.usage_ledger ul
    WHERE ul.user_id = p_user_id
      AND ul.event_type = p_event_type
      AND ul.idempotency_key = p_idempotency_key
  ) INTO v_already_exists;

  IF v_already_exists THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'idempotent',
      'plan_key', v_plan_key
    );
  END IF;

  SELECT COALESCE(SUM(ul.quantity), 0)::bigint INTO v_current_usage
  FROM public.usage_ledger ul
  WHERE ul.user_id = p_user_id
    AND ul.event_type = p_event_type
    AND ul.created_at >= v_period_start
    AND ul.created_at < v_period_end;

  IF v_current_usage > v_limit - p_quantity::bigint THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'quota_exceeded',
      'current', v_current_usage,
      'limit', v_limit,
      'plan_key', v_plan_key
    );
  END IF;

  INSERT INTO public.usage_ledger (
    user_id,
    event_type,
    quantity,
    idempotency_key,
    period_start,
    period_end,
    source_route,
    reference_id,
    metadata
  ) VALUES (
    p_user_id,
    p_event_type,
    p_quantity,
    p_idempotency_key,
    v_period_start,
    v_period_end,
    p_source_route,
    p_reference_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'recorded',
    'current', v_current_usage + p_quantity::bigint,
    'limit', v_limit,
    'plan_key', v_plan_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON TABLE public.plan_quotas IS
  'Billing plan quota source for the canonical usage RPC; mirrored in lib/billing/plans.ts and guarded by tests.';

COMMENT ON FUNCTION public.record_usage_with_quota_check(
  uuid,
  text,
  integer,
  text,
  integer,
  timestamptz,
  timestamptz,
  text,
  uuid,
  jsonb
) IS
  'Authoritative 10-argument usage quota RPC. Quota limits come from public.plan_quotas; lib/billing/plans.ts is the TypeScript mirror guarded by tests.';
