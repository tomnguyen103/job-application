-- Allow route handlers to perform quota writes without a Vercel admin API key.
-- Each RPC is SECURITY DEFINER for the usage_ledger write, but still requires
-- the authenticated user to match the p_user_id being mutated.

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

  SELECT EXISTS(
    SELECT 1 FROM usage_ledger
    WHERE user_id = p_user_id
      AND event_type = p_event_type
      AND idempotency_key = p_idempotency_key
  ) INTO v_already_exists;

  IF v_already_exists THEN
    RETURN jsonb_build_object('success', true, 'status', 'idempotent');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

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

CREATE OR REPLACE FUNCTION release_reserved_usage(
  p_user_id uuid,
  p_event_type text,
  p_idempotency_key text
) RETURNS jsonb AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'status', 'unauthorized');
  END IF;

  DELETE FROM usage_ledger
  WHERE user_id = p_user_id
    AND event_type = p_event_type
    AND idempotency_key = p_idempotency_key;

  RETURN jsonb_build_object('success', true, 'status', 'released');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION adjust_reserved_usage(
  p_user_id uuid,
  p_event_type text,
  p_idempotency_key text,
  p_actual_quantity integer
) RETURNS jsonb AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'status', 'unauthorized');
  END IF;

  IF p_actual_quantity <= 0 THEN
    DELETE FROM usage_ledger
    WHERE user_id = p_user_id
      AND event_type = p_event_type
      AND idempotency_key = p_idempotency_key;

    RETURN jsonb_build_object('success', true, 'status', 'released');
  END IF;

  UPDATE usage_ledger
  SET quantity = p_actual_quantity
  WHERE user_id = p_user_id
    AND event_type = p_event_type
    AND idempotency_key = p_idempotency_key
    AND quantity > p_actual_quantity;

  RETURN jsonb_build_object('success', true, 'status', 'adjusted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
