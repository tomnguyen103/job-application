-- Keep positional 7-argument callers working after the canonical RPC moved
-- back to the backwards-compatible 10-argument signature.

CREATE OR REPLACE FUNCTION record_usage_with_quota_check(
  p_user_id uuid,
  p_event_type text,
  p_quantity integer,
  p_idempotency_key text,
  p_source_route text,
  p_reference_id uuid,
  p_metadata jsonb
) RETURNS jsonb AS $$
BEGIN
  RETURN public.record_usage_with_quota_check(
    p_user_id => p_user_id,
    p_event_type => p_event_type,
    p_quantity => p_quantity,
    p_idempotency_key => p_idempotency_key,
    p_limit => NULL,
    p_period_start => NULL,
    p_period_end => NULL,
    p_source_route => p_source_route,
    p_reference_id => p_reference_id,
    p_metadata => p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
