-- Migration 0023: Team Members table for Manager Dashboard

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL,
  member_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_members_tenant_isolation ON team_members
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_unique ON team_members (manager_id, member_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_manager ON team_members (manager_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON team_members (member_id, tenant_id);
