-- Derive quota limits and billing windows inside the SECURITY DEFINER RPC.
-- Callers may record usage for their own user only. p_limit, p_period_start,
-- and p_period_end are ignored compatibility inputs for already-deployed code.

DROP FUNCTION IF EXISTS record_usage_with_quota_check(
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
);

CREATE OR REPLACE FUNCTION record_usage_with_quota_check(
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
  v_current_usage integer := 0;
  v_current_period_end timestamptz;
  v_current_period_start timestamptz;
  v_period_end timestamptz;
  v_period_start timestamptz;
  v_plan_key text := 'free';
  v_status text := 'active';
  v_limit integer;
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

  v_limit := CASE v_plan_key
    WHEN 'pro' THEN CASE p_event_type
      WHEN 'job_search_run' THEN 50
      WHEN 'job_match_score' THEN 500
      WHEN 'company_research_run' THEN 25
      WHEN 'tailored_resume_generate' THEN 30
      WHEN 'base_resume_generate' THEN 10
      WHEN 'resume_extract' THEN 10
      ELSE NULL
    END
    ELSE CASE p_event_type
      WHEN 'job_search_run' THEN 3
      WHEN 'job_match_score' THEN 30
      WHEN 'company_research_run' THEN 2
      WHEN 'tailored_resume_generate' THEN 2
      WHEN 'base_resume_generate' THEN 2
      WHEN 'resume_extract' THEN 2
      ELSE NULL
    END
  END;

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

  SELECT COALESCE(SUM(ul.quantity), 0) INTO v_current_usage
  FROM public.usage_ledger ul
  WHERE ul.user_id = p_user_id
    AND ul.event_type = p_event_type
    AND ul.created_at >= v_period_start
    AND ul.created_at < v_period_end;

  IF v_current_usage + p_quantity > v_limit THEN
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
    p_metadata
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'recorded',
    'current', v_current_usage + p_quantity,
    'limit', v_limit,
    'plan_key', v_plan_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
