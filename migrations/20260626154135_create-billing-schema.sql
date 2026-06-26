-- Phase 6S.1 - Billing Domain Foundation
-- Create tables user_entitlements, usage_ledger, and billing_webhook_events.
-- Enable RLS and owner-scoped policies.

CREATE TABLE user_entitlements (
  user_id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_key               text NOT NULL DEFAULT 'free',
  status                 text NOT NULL DEFAULT 'active',
  stripe_customer_id     text,
  stripe_subscription_id text,
  stripe_price_id        text,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  source                 text NOT NULL DEFAULT 'system',
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_user_entitlements_plan CHECK (plan_key IN ('free', 'pro')),
  CONSTRAINT chk_user_entitlements_status CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  CONSTRAINT chk_user_entitlements_source CHECK (source IN ('system', 'stripe'))
);

CREATE TABLE usage_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  quantity        integer NOT NULL DEFAULT 1,
  idempotency_key text NOT NULL,
  period_start    timestamptz NOT NULL,
  period_end      timestamptz NOT NULL,
  source_route    text,
  reference_id    uuid,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_usage_ledger_quantity CHECK (quantity > 0),
  CONSTRAINT uq_usage_ledger_user_event_idempotency UNIQUE (user_id, event_type, idempotency_key)
);

CREATE INDEX idx_usage_ledger_query
  ON usage_ledger (user_id, event_type, period_start, period_end);

CREATE INDEX idx_usage_ledger_created_at
  ON usage_ledger (user_id, created_at DESC);

CREATE TABLE billing_webhook_events (
  stripe_event_id   text PRIMARY KEY,
  event_type        text NOT NULL,
  processed_at      timestamptz NOT NULL DEFAULT now(),
  payload           jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'pending',
  error             text,
  CONSTRAINT chk_billing_webhook_events_status CHECK (processing_status IN ('pending', 'processed', 'failed', 'ignored'))
);

-- Enable RLS
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;

-- user_entitlements policies
CREATE POLICY user_entitlements_select_own
  ON user_entitlements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- usage_ledger policies
CREATE POLICY usage_ledger_select_own
  ON usage_ledger FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


