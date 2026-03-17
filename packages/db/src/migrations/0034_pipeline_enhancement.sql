-- Phase 65: Pipeline Enhancement — versioning, templates, published run reference
-- Migration 0034

-- 1. Versioning on runs
ALTER TABLE lesson_pipeline_runs ADD COLUMN lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE;
ALTER TABLE lesson_pipeline_runs ADD COLUMN run_number integer NOT NULL DEFAULT 1;
ALTER TABLE lesson_pipeline_runs ADD COLUMN triggered_by text DEFAULT 'MANUAL';
ALTER TABLE lesson_pipeline_runs ADD CONSTRAINT uq_runs_lesson_run_number
  UNIQUE (lesson_id, run_number);

-- 2. Pipeline templates
CREATE TABLE lesson_pipeline_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) <= 100),
  description text CHECK (length(description) <= 500),
  nodes jsonb NOT NULL DEFAULT '[]' CHECK (pg_column_size(nodes) <= 65536),
  config jsonb NOT NULL DEFAULT '{}',
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE lesson_pipeline_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_templates ON lesson_pipeline_templates FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid OR is_system = true);
CREATE POLICY modify_templates ON lesson_pipeline_templates FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid AND is_system = false);

-- 3. Published run reference
ALTER TABLE lessons ADD COLUMN published_run_id uuid REFERENCES lesson_pipeline_runs(id) ON DELETE SET NULL;
CREATE INDEX idx_lessons_published_run_id ON lessons(published_run_id);
