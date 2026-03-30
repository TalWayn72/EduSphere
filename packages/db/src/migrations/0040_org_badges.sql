-- 0037_org_badges.sql — Per-org customizable badges with auto-award criteria (F-12)

CREATE TABLE IF NOT EXISTS org_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  icon_url TEXT,
  xp_required INTEGER NOT NULL DEFAULT 0,
  auto_award_criteria JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE org_badges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'org_badges' AND policyname = 'org_badges_tenant_isolation'
  ) THEN
    EXECUTE 'CREATE POLICY org_badges_tenant_isolation ON org_badges
      USING (tenant_id::text = current_setting(''app.current_tenant'', TRUE))
      WITH CHECK (tenant_id::text = current_setting(''app.current_tenant'', TRUE))';
  END IF;
END
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_badges_tenant ON org_badges (tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_badges_active ON org_badges (tenant_id, is_active);
