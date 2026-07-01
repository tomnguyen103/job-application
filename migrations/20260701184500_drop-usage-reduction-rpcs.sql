-- The pre-merge production hotfix briefly added usage-reduction RPCs. Remove
-- them and replace record_usage_with_quota_check with the final guarded shape.

CREATE OR REPLACE FUNCTION record_usage_with_quota_check(
  p_user_id uuid,
  p_event_type text,
  p_quantity integer,
  p_idempotency_key text,
  p_limit integer,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_source_route text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb AS $$
DECLARE
  v_current_usage integer := 0;
  v_already_exists boolean := false;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'status', 'unauthorized');
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_quantity');
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_idempotency_key');
  END IF;

  IF p_limit IS NULL OR p_limit < 0 THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_limit');
  END IF;

  IF p_period_start IS NULL OR p_period_end IS NULL OR p_period_start >= p_period_end THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_period');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT EXISTS(
    SELECT 1 FROM usage_ledger
    WHERE user_id = p_user_id
      AND event_type = p_event_type
      AND idempotency_key = p_idempotency_key
  ) INTO v_already_exists;

  IF v_already_exists THEN
    RETURN jsonb_build_object('success', true, 'status', 'idempotent');
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_current_usage
  FROM usage_ledger
  WHERE user_id = p_user_id
    AND event_type = p_event_type
    AND created_at >= p_period_start
    AND created_at < p_period_end;

  IF v_current_usage + p_quantity > p_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'quota_exceeded',
      'current', v_current_usage,
      'limit', p_limit
    );
  END IF;

  INSERT INTO usage_ledger (
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
    p_period_start,
    p_period_end,
    p_source_route,
    p_reference_id,
    p_metadata
  );

  RETURN jsonb_build_object('success', true, 'status', 'recorded');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS release_reserved_usage(uuid, text, text);
DROP FUNCTION IF EXISTS adjust_reserved_usage(uuid, text, text, integer);
