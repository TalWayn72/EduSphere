-- Migration 0017: Tenant Analytics Snapshots (Phase 35)
-- Creates tenant_analytics_snapshots table with RLS for daily/weekly/monthly rollups

-- ─── enum ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE analytics_snapshot_type AS ENUM ('daily', 'weekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── tenant_analytics_snapshots ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  active_learners INTEGER NOT NULL DEFAULT 0,
  completions INTEGER NOT NULL DEFAULT 0,
  avg_completion_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_learning_minutes INTEGER NOT NULL DEFAULT 0,
  new_enrollments INTEGER NOT NULL DEFAULT 0,
  snapshot_type analytics_snapshot_type NOT NULL DEFAULT 'daily',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_tenant
  ON tenant_analytics_snapshots(tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_snapshots_unique
  ON tenant_analytics_snapshots(tenant_id, snapshot_date, snapshot_type);

ALTER TABLE tenant_analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_analytics_snapshots_tenant_isolation" ON tenant_analytics_snapshots
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));
