-- Create record_usage_with_quota_check PL/pgSQL function for atomic usage tracking and quota checks.
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
  -- Check idempotency
  SELECT EXISTS(
    SELECT 1 FROM usage_ledger 
    WHERE user_id = p_user_id 
      AND event_type = p_event_type 
      AND idempotency_key = p_idempotency_key
  ) INTO v_already_exists;

  IF v_already_exists THEN
    RETURN jsonb_build_object('success', true, 'status', 'idempotent');
  END IF;

  -- Lock the usage_ledger rows for this user and period to prevent concurrent inserts
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- Sum current usage
  SELECT COALESCE(SUM(quantity), 0) INTO v_current_usage
  FROM usage_ledger
  WHERE user_id = p_user_id
    AND event_type = p_event_type
    AND created_at >= p_period_start
    AND created_at < p_period_end;

  -- Check quota
  IF v_current_usage + p_quantity > p_limit THEN
    RETURN jsonb_build_object(
      'success', false, 
      'status', 'quota_exceeded',
      'current', v_current_usage,
      'limit', p_limit
    );
  END IF;

  -- Record usage
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
