-- Migration 0018: Push Notification Tokens (Phase 35)
-- Creates push_notification_tokens table with RLS for web/iOS/Android push delivery

-- ─── enum ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE push_platform AS ENUM ('web', 'ios', 'android');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── push_notification_tokens ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  token TEXT NOT NULL,
  platform push_platform NOT NULL,
  expo_push_token TEXT,
  web_push_subscription JSON,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user
  ON push_notification_tokens(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_unique
  ON push_notification_tokens(user_id, token);

CREATE INDEX IF NOT EXISTS idx_push_tokens_platform
  ON push_notification_tokens(user_id, platform);

ALTER TABLE push_notification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_user_isolation" ON push_notification_tokens
  USING (user_id::text = current_setting('app.current_user_id', TRUE));
