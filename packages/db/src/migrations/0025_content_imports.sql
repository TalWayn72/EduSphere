-- Migration 0025: content_imports & content_import_logs
-- Tracks async import jobs (YouTube, folder, website, zip, drive)

-- content_imports — tracks import jobs
CREATE TABLE IF NOT EXISTS content_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  course_id UUID,
  module_id UUID,
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('youtube', 'folder', 'website', 'zip', 'drive')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED', 'CANCELLED')),
  lesson_count INTEGER NOT NULL DEFAULT 0,
  progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  source_url TEXT,
  api_quota_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- content_import_logs — per-lesson tracking
CREATE TABLE IF NOT EXISTS content_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES content_imports(id) ON DELETE CASCADE,
  lesson_index INTEGER NOT NULL,
  lesson_title TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED')),
  error_msg TEXT,
  content_item_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_content_imports_tenant_user
  ON content_imports(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_content_imports_course
  ON content_imports(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_import_logs_import
  ON content_import_logs(import_id);

-- RLS policies
ALTER TABLE content_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_imports_tenant_isolation ON content_imports
  USING (tenant_id = current_setting('app.current_tenant', TRUE)::UUID);

CREATE POLICY content_import_logs_via_import ON content_import_logs
  USING (import_id IN (
    SELECT id FROM content_imports
    WHERE tenant_id = current_setting('app.current_tenant', TRUE)::UUID
  ));
