-- Keep the legacy positional quota RPC shape working while ignoring caller
-- supplied quota values.

CREATE OR REPLACE FUNCTION record_usage_with_quota_check(
  p_user_id uuid,
  p_event_type text,
  p_quantity integer,
  p_limit integer,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_idempotency_key text
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
    p_source_route => NULL,
    p_reference_id => NULL,
    p_metadata => '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
