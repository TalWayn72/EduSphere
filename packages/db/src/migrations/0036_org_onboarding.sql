-- FEAT-ORG-ONBOARDING Phase 1: Organization Self-Service Onboarding
-- SI-1: RLS session variable = app.current_tenant (tenant isolation)
-- SI-1: RLS session variable = app.current_user_id (NOT app.current_user)
-- SI-1: RLS session variable = app.current_user_role (role checks)

-- ---------------------------------------------------------------------------
-- 1. Extend tenants table with provisioning columns
-- ---------------------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provisioning_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS provisioning_steps JSONB DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 2. org_onboarding_checklist — per-tenant onboarding progress
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_onboarding_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  steps JSONB NOT NULL DEFAULT '[
    {"key":"BRANDING_CONFIGURED","completed":false},
    {"key":"FIRST_USER_INVITED","completed":false},
    {"key":"FIRST_COURSE_CREATED","completed":false},
    {"key":"DOMAIN_CONFIGURED","completed":false},
    {"key":"SSO_CONFIGURED","completed":false}
  ]',
  all_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE org_onboarding_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_onboarding_checklist_tenant_isolation
  ON org_onboarding_checklist
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- ---------------------------------------------------------------------------
-- 3. org_invitations — email-based user invitation system
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invited_email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
  token VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  invited_by UUID NOT NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_invitations_tenant_isolation ON org_invitations
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS idx_org_invitations_tenant
  ON org_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email
  ON org_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_status
  ON org_invitations(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invitations_token
  ON org_invitations(token);

-- ---------------------------------------------------------------------------
-- 4. course_licenses — cross-tenant content marketplace licensing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  course_id UUID NOT NULL,
  license_type VARCHAR(20) NOT NULL DEFAULT 'UNLIMITED'
    CHECK (license_type IN ('UNLIMITED', 'PER_SEAT', 'TIME_LIMITED')),
  max_seats INTEGER,
  used_seats INTEGER NOT NULL DEFAULT 0,
  licensed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  licensor_tenant_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE course_licenses ENABLE ROW LEVEL SECURITY;

-- Dual-tenant policy: both licensee and licensor can access
CREATE POLICY course_licenses_tenant_isolation ON course_licenses
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    OR licensor_tenant_id::text = current_setting('app.current_tenant', TRUE)
  )
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS idx_course_licenses_tenant
  ON course_licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_course_licenses_course
  ON course_licenses(course_id);
CREATE INDEX IF NOT EXISTS idx_course_licenses_licensor
  ON course_licenses(licensor_tenant_id);
CREATE INDEX IF NOT EXISTS idx_course_licenses_status
  ON course_licenses(status);

-- ---------------------------------------------------------------------------
-- 5. api_keys — per-tenant API key management (bcrypt hash storage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(200) NOT NULL,
  key_hash VARCHAR(128) NOT NULL,
  key_prefix VARCHAR(8) NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Only ORG_ADMIN and SUPER_ADMIN can manage API keys
CREATE POLICY api_keys_tenant_isolation ON api_keys
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND current_setting('app.current_user_role', TRUE) IN ('ORG_ADMIN', 'SUPER_ADMIN')
  )
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- ---------------------------------------------------------------------------
-- 6. webhooks — per-tenant webhook endpoint definitions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  url VARCHAR(2048) NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret VARCHAR(128) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhooks_tenant_isolation ON webhooks
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);

-- ---------------------------------------------------------------------------
-- 7. webhook_deliveries — webhook delivery audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id),
  tenant_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'DELIVERED', 'FAILED', 'RETRYING')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_deliveries_tenant_isolation ON webhook_deliveries
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook
  ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status
  ON webhook_deliveries(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant
  ON webhook_deliveries(tenant_id);

-- ---------------------------------------------------------------------------
-- 8. gamification_config — per-tenant gamification settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gamification_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  show_leaderboard BOOLEAN NOT NULL DEFAULT TRUE,
  show_badges BOOLEAN NOT NULL DEFAULT TRUE,
  show_points BOOLEAN NOT NULL DEFAULT TRUE,
  show_streaks BOOLEAN NOT NULL DEFAULT TRUE,
  xp_rules JSONB NOT NULL DEFAULT '{
    "course_completion": 100,
    "lesson_completion": 10,
    "quiz_pass": 25,
    "discussion_post": 5,
    "peer_review": 15,
    "streak_bonus_per_day": 2,
    "daily_login": 1
  }',
  leaderboard_scope VARCHAR(20) NOT NULL DEFAULT 'TENANT'
    CHECK (leaderboard_scope IN ('TENANT', 'DEPARTMENT', 'GLOBAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gamification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY gamification_config_tenant_isolation ON gamification_config
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
