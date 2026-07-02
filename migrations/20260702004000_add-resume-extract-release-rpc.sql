-- Release only this route's recent server-generated resume extraction reservation
-- when parsing throws or returns no extracted data. This is intentionally not a
-- generic usage-reduction primitive.

CREATE OR REPLACE FUNCTION release_resume_extract_reservation(
  p_user_id uuid,
  p_idempotency_key text
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

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  DELETE FROM public.usage_ledger ul
  WHERE ul.user_id = p_user_id
    AND ul.event_type = 'resume_extract'
    AND ul.idempotency_key = p_idempotency_key
    AND ul.source_route = '/api/resume/extract'
    AND ul.created_at >= now() - interval '10 minutes'
    AND ul.metadata->>'reservationKind' = 'resume_extract_parse';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 1 THEN
    RETURN jsonb_build_object('success', true, 'status', 'released');
  END IF;

  RETURN jsonb_build_object('success', false, 'status', 'not_found');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION release_resume_extract_reservation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION release_resume_extract_reservation(uuid, text) TO authenticated;
