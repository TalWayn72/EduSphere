CREATE TABLE IF NOT EXISTS proctoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  assessment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | ACTIVE | COMPLETED | FLAGGED
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  flags JSONB DEFAULT '[]'::jsonb,
  recording_key TEXT, -- MinIO object key for optional recording
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_assessment ON proctoring_sessions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_tenant ON proctoring_sessions(tenant_id);

ALTER TABLE proctoring_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_proctoring" ON proctoring_sessions
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));
