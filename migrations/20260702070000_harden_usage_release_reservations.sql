CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP FUNCTION IF EXISTS public.release_resume_extract_reservation(uuid, text);

CREATE OR REPLACE FUNCTION public.release_resume_extract_reservation(
  p_user_id uuid,
  p_idempotency_key text,
  p_release_token text
) RETURNS jsonb AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'status', 'unauthorized');
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_idempotency_key');
  END IF;

  IF p_release_token IS NULL OR btrim(p_release_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_release_token');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  DELETE FROM public.usage_ledger ul
  WHERE ul.user_id = p_user_id
    AND ul.event_type = 'resume_extract'
    AND ul.idempotency_key = p_idempotency_key
    AND ul.source_route = '/api/resume/extract'
    AND ul.created_at >= now() - interval '10 minutes'
    AND ul.metadata->>'reservationKind' = 'resume_extract_parse'
    AND ul.metadata->>'releaseTokenHash' = encode(digest(p_release_token, 'sha256'), 'hex');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 1 THEN
    RETURN jsonb_build_object('success', true, 'status', 'released');
  END IF;

  RETURN jsonb_build_object('success', false, 'status', 'not_found');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.release_tailored_resume_generation_reservation(
  p_user_id uuid,
  p_idempotency_key text,
  p_source_route text,
  p_reference_id uuid,
  p_release_token text
) RETURNS jsonb AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'status', 'unauthorized');
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_idempotency_key');
  END IF;

  IF p_source_route IS NULL OR btrim(p_source_route) = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_source_route');
  END IF;

  IF p_reference_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_reference_id');
  END IF;

  IF p_release_token IS NULL OR btrim(p_release_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_release_token');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  DELETE FROM public.usage_ledger ul
  WHERE ul.user_id = p_user_id
    AND ul.event_type = 'tailored_resume_generate'
    AND ul.idempotency_key = p_idempotency_key
    AND ul.source_route = p_source_route
    AND ul.reference_id = p_reference_id
    AND ul.created_at >= now() - interval '10 minutes'
    AND ul.metadata->>'reservationKind' = 'tailored_resume_generate'
    AND ul.metadata->>'releaseTokenHash' = encode(digest(p_release_token, 'sha256'), 'hex');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 1 THEN
    RETURN jsonb_build_object('success', true, 'status', 'released');
  END IF;

  RETURN jsonb_build_object('success', false, 'status', 'not_found');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.release_company_research_reservation(
  p_user_id uuid,
  p_idempotency_key text,
  p_reference_id uuid,
  p_release_token text
) RETURNS jsonb AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'status', 'unauthorized');
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_idempotency_key');
  END IF;

  IF p_reference_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_reference_id');
  END IF;

  IF p_release_token IS NULL OR btrim(p_release_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_release_token');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  DELETE FROM public.usage_ledger ul
  WHERE ul.user_id = p_user_id
    AND ul.event_type = 'company_research_run'
    AND ul.idempotency_key = p_idempotency_key
    AND ul.source_route = '/api/agent/research'
    AND ul.reference_id = p_reference_id
    AND ul.created_at >= now() - interval '10 minutes'
    AND ul.metadata->>'reservationKind' = 'company_research_run'
    AND ul.metadata->>'releaseTokenHash' = encode(digest(p_release_token, 'sha256'), 'hex');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 1 THEN
    RETURN jsonb_build_object('success', true, 'status', 'released');
  END IF;

  RETURN jsonb_build_object('success', false, 'status', 'not_found');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS public.record_usage_with_quota_check(
  uuid,
  text,
  integer,
  integer,
  timestamptz,
  timestamptz,
  text
);

DROP FUNCTION IF EXISTS public.record_usage_with_quota_check(
  uuid,
  text,
  integer,
  text,
  text,
  uuid,
  jsonb
);

REVOKE ALL ON FUNCTION public.record_usage_with_quota_check(
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
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_usage_with_quota_check(
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
) TO authenticated;

REVOKE ALL ON FUNCTION public.release_resume_extract_reservation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_resume_extract_reservation(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.release_base_resume_generation_reservation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_base_resume_generation_reservation(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.release_tailored_resume_generation_reservation(
  uuid,
  text,
  text,
  uuid,
  text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_tailored_resume_generation_reservation(
  uuid,
  text,
  text,
  uuid,
  text
) TO authenticated;

REVOKE ALL ON FUNCTION public.release_company_research_reservation(uuid, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_company_research_reservation(uuid, text, uuid, text) TO authenticated;
