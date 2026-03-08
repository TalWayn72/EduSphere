-- Migration 0024: Onboarding State table

CREATE TABLE IF NOT EXISTS onboarding_state (
  user_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 5,
  completed BOOLEAN NOT NULL DEFAULT false,
  skipped BOOLEAN NOT NULL DEFAULT false,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own onboarding state
CREATE POLICY onboarding_state_user_isolation ON onboarding_state
  USING (user_id::text = current_setting('app.current_user_id', TRUE));

CREATE INDEX idx_onboarding_tenant ON onboarding_state (tenant_id);
