-- Migration 0031: B2B2C Partner Portal
-- Phase 52: partners + partner_revenue tables
-- RLS: SUPER_ADMIN only (cross-tenant; no tenant scoping)
-- SI-1: RLS session variable = app.current_user_role (SUPER_ADMIN check)

-- ---------------------------------------------------------------------------
-- 1. partner_type enum
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE partner_type AS ENUM (
    'TRAINING_COMPANY',
    'CONTENT_CREATOR',
    'RESELLER',
    'SYSTEM_INTEGRATOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. partners — partner organizations (cross-tenant; SUPER_ADMIN access only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partners (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  type            partner_type NOT NULL,
  contact_email   TEXT        NOT NULL,
  -- SHA-256 hash of actual API key — plaintext NEVER stored (SI-3 key hygiene)
  api_key_hash    TEXT        NOT NULL,
  -- Set after approval; NULL while pending
  tenant_id       UUID        REFERENCES tenants(id) ON DELETE SET NULL,
  -- Percentage EduSphere retains (e.g. 30 = 30%)
  rev_share_pct   INTEGER     NOT NULL DEFAULT 30,
  -- pending | active | suspended
  status          TEXT        NOT NULL DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partners_status
  ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_email
  ON partners(contact_email);

-- RLS: SUPER_ADMIN only (partners are cross-tenant entities)
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY partners_superadmin ON partners
  FOR ALL
  USING (current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN');

-- ---------------------------------------------------------------------------
-- 3. partner_revenue — monthly revenue share records (SUPER_ADMIN only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partner_revenue (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id         UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  -- Format: YYYY-MM (e.g. "2026-03")
  month              VARCHAR(7)  NOT NULL,
  -- All amounts in USD cents
  gross_rev_usd      INTEGER     NOT NULL,
  platform_cut_usd   INTEGER     NOT NULL,
  partner_payout_usd INTEGER     NOT NULL,
  -- pending | paid
  status             TEXT        NOT NULL DEFAULT 'pending',
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partner_revenue_partner_month_unique UNIQUE (partner_id, month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partner_revenue_partner
  ON partner_revenue(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_revenue_month
  ON partner_revenue(month);

-- RLS: SUPER_ADMIN only
ALTER TABLE partner_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY partner_revenue_superadmin ON partner_revenue
  FOR ALL
  USING (current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN');
