-- Migration 0010: Multi-tenant theme customization
-- tenant_themes: stores per-tenant CSS variable overrides

CREATE TABLE IF NOT EXISTS tenant_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'Default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  primitives JSONB NOT NULL DEFAULT '{}',
  -- Primitives keys match CSS variable names without '--': primary, background, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- RLS
ALTER TABLE tenant_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_themes_isolation ON tenant_themes
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_themes_admin_write ON tenant_themes
  FOR ALL
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
  );

-- user_theme_preferences: per-user overrides (theme mode, font size, etc.)
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(10) NOT NULL DEFAULT 'system'
    CHECK (theme_mode IN ('light', 'dark', 'system')),
  ADD COLUMN IF NOT EXISTS font_size VARCHAR(10) NOT NULL DEFAULT 'md'
    CHECK (font_size IN ('sm', 'md', 'lg', 'xl')),
  ADD COLUMN IF NOT EXISTS reading_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motion_preference VARCHAR(10) NOT NULL DEFAULT 'full'
    CHECK (motion_preference IN ('full', 'reduced', 'none')),
  ADD COLUMN IF NOT EXISTS contrast_mode VARCHAR(10) NOT NULL DEFAULT 'normal'
    CHECK (contrast_mode IN ('normal', 'high'));
