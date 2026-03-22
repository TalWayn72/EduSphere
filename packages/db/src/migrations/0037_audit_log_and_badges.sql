-- Migration 0037: Tenant Audit Log + Org Badges (F-10 Content Isolation + F-12 Gamification)
-- GDPR Art.32 + SOC2 CC7.2: Per-tenant audit trail for all mutations
-- Org Badges: Per-tenant custom badge definitions with auto-award criteria

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════════
-- 1. tenant_audit_log — fine-grained per-tenant audit trail
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenant_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  actor_id      UUID,
  action        VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id   UUID,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: tenant isolation
ALTER TABLE tenant_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_audit_log_tenant_isolation
  ON tenant_audit_log
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- Performance index for time-range queries within tenant
CREATE INDEX idx_tenant_audit_log_tenant_created
  ON tenant_audit_log (tenant_id, created_at DESC);

-- Index for filtering by action type
CREATE INDEX idx_tenant_audit_log_action
  ON tenant_audit_log (tenant_id, action);

-- ════════════════════════════════════════════════════════════════════════════════
-- 2. org_badges — per-tenant custom badge definitions (F-12)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS org_badges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  name                VARCHAR(100) NOT NULL,
  description         TEXT,
  icon_url            TEXT,
  xp_required         INT NOT NULL DEFAULT 0,
  auto_award_criteria JSONB,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: tenant isolation
ALTER TABLE org_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_badges_tenant_isolation
  ON org_badges
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- Unique badge name per tenant
CREATE UNIQUE INDEX idx_org_badges_tenant_name
  ON org_badges (tenant_id, name);

-- Active badges lookup
CREATE INDEX idx_org_badges_active
  ON org_badges (tenant_id, is_active) WHERE is_active = true;

COMMIT;
