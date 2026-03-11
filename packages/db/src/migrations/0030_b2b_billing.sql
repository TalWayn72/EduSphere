-- Phase 50: B2B Billing, Subscription Plans & YAU Counting
-- SI-1: RLS session variable = app.current_tenant (tenant isolation)
-- SI-1: RLS session variable = app.current_user_id (NOT app.current_user)

-- ---------------------------------------------------------------------------
-- 1. subscription_plans — platform-level plan catalogue (no RLS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  price_usd_cents INTEGER NOT NULL,
  billing_period_months INTEGER NOT NULL DEFAULT 12,
  max_yau INTEGER,                         -- NULL = unlimited
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active
  ON subscription_plans(is_active);

-- Seed canonical plan tiers (idempotent)
INSERT INTO subscription_plans (name, price_usd_cents, billing_period_months, max_yau, features)
VALUES
  ('Starter',    299900,  12,   500,  '{"sso":false,"api_access":false,"custom_domain":false,"dedicated_csm":false}'),
  ('Growth',     999900,  12,  2000,  '{"sso":true,"api_access":true,"custom_domain":false,"dedicated_csm":false}'),
  ('University', 2999900, 12,  10000, '{"sso":true,"api_access":true,"custom_domain":true,"dedicated_csm":false}'),
  ('Enterprise', 0,       12,  NULL,  '{"sso":true,"api_access":true,"custom_domain":true,"dedicated_csm":true}')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. tenant_subscriptions — per-tenant active subscription (RLS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing','active','past_due','canceled','pilot')),
  pilot_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  max_yau INTEGER,                         -- NULL = use plan default
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_subscriptions_tenant_isolation ON tenant_subscriptions
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_subscriptions_admin_write ON tenant_subscriptions
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    OR current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'
  );

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant
  ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status
  ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_stripe_sub
  ON tenant_subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. yau_events — Yearly Active User tracking (RLS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS yau_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  first_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_counted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT yau_events_tenant_user_year_unique UNIQUE (tenant_id, user_id, year)
);

ALTER TABLE yau_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY yau_events_tenant_isolation ON yau_events
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY yau_events_admin_read ON yau_events
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
  );

CREATE INDEX IF NOT EXISTS idx_yau_events_tenant_year
  ON yau_events(tenant_id, year);
CREATE INDEX IF NOT EXISTS idx_yau_events_user
  ON yau_events(user_id);
CREATE INDEX IF NOT EXISTS idx_yau_events_is_counted
  ON yau_events(tenant_id, is_counted);

-- ---------------------------------------------------------------------------
-- 4. pilot_requests — B2B pilot sign-up queue (no RLS — public submissions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pilot_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name VARCHAR(255) NOT NULL,
  org_type VARCHAR(50) NOT NULL
    CHECK (org_type IN ('university','college','corporate','government','defense')),
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  estimated_users INTEGER,
  use_case TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','expired')),
  approved_at TIMESTAMPTZ,
  tenant_id UUID,                          -- populated after tenant provisioning
  pilot_ends_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pilot_requests_status
  ON pilot_requests(status);
CREATE INDEX IF NOT EXISTS idx_pilot_requests_email
  ON pilot_requests(contact_email);
CREATE INDEX IF NOT EXISTS idx_pilot_requests_tenant
  ON pilot_requests(tenant_id)
  WHERE tenant_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. usage_snapshots — monthly billing snapshots (RLS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  snapshot_month DATE NOT NULL,           -- first day of month, e.g. 2026-03-01
  yau_count INTEGER NOT NULL DEFAULT 0,
  active_users_count INTEGER NOT NULL DEFAULT 0,
  courses_count INTEGER NOT NULL DEFAULT 0,
  storage_gb NUMERIC(10,4) NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usage_snapshots_tenant_month_unique UNIQUE (tenant_id, snapshot_month)
);

ALTER TABLE usage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_snapshots_tenant_isolation ON usage_snapshots
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY usage_snapshots_admin_read ON usage_snapshots
  USING (
    current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
  );

CREATE INDEX IF NOT EXISTS idx_usage_snapshots_tenant
  ON usage_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_month
  ON usage_snapshots(snapshot_month);
