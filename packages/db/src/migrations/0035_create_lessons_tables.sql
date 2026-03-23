-- Migration 0035: Ensure lessons tables exist with all columns, RLS, and policies
-- Root cause: Drizzle schema (packages/db/src/schema/lesson.ts) defines 6 tables.
-- Tables may already exist (from Drizzle push) but may be missing columns that
-- 0034_pipeline_enhancement added and 0034_pipeline_enhancement_down removed.
-- This migration is fully idempotent.

-- 1. Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id       UUID REFERENCES modules(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'THEMATIC'
                    CHECK (type IN ('THEMATIC', 'SEQUENTIAL')),
  series          TEXT,
  lesson_date     TIMESTAMPTZ,
  instructor_id   UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'PROCESSING', 'READY', 'PUBLISHED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- Add published_run_id if missing (may have been removed by 0034_down)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'published_run_id'
  ) THEN
    ALTER TABLE lessons ADD COLUMN published_run_id UUID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_tenant_id ON lessons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lessons_instructor_id ON lessons(instructor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);

-- 2. Lesson assets table
CREATE TABLE IF NOT EXISTS lesson_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  asset_type      TEXT NOT NULL
                    CHECK (asset_type IN ('VIDEO', 'AUDIO', 'NOTES', 'WHITEBOARD')),
  source_url      TEXT,
  file_url        TEXT,
  media_asset_id  UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_assets_lesson_id ON lesson_assets(lesson_id);

-- 3. Lesson pipelines table
CREATE TABLE IF NOT EXISTS lesson_pipelines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  template_name   TEXT,
  nodes           JSONB NOT NULL DEFAULT '[]',
  config          JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'READY', 'RUNNING', 'COMPLETED', 'FAILED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_pipelines_lesson_id ON lesson_pipelines(lesson_id);

-- 4. Lesson pipeline runs table
CREATE TABLE IF NOT EXISTS lesson_pipeline_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id     UUID NOT NULL REFERENCES lesson_pipelines(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'RUNNING'
                    CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  logs            JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns that 0034 added and 0034_down removed
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_pipeline_runs' AND column_name = 'lesson_id'
  ) THEN
    ALTER TABLE lesson_pipeline_runs
      ADD COLUMN lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_pipeline_runs' AND column_name = 'run_number'
  ) THEN
    ALTER TABLE lesson_pipeline_runs
      ADD COLUMN run_number INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_pipeline_runs' AND column_name = 'triggered_by'
  ) THEN
    ALTER TABLE lesson_pipeline_runs
      ADD COLUMN triggered_by TEXT DEFAULT 'MANUAL';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lesson_pipeline_runs_pipeline_id ON lesson_pipeline_runs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_lesson_pipeline_runs_lesson_id ON lesson_pipeline_runs(lesson_id);

-- 5. Lesson pipeline results table
CREATE TABLE IF NOT EXISTS lesson_pipeline_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID NOT NULL REFERENCES lesson_pipeline_runs(id) ON DELETE CASCADE,
  module_name     TEXT NOT NULL,
  output_type     TEXT NOT NULL,
  output_data     JSONB NOT NULL DEFAULT '{}',
  file_url        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_pipeline_results_run_id ON lesson_pipeline_results(run_id);

-- 6. Lesson citations table
CREATE TABLE IF NOT EXISTS lesson_citations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  source_text     TEXT NOT NULL,
  book_name       TEXT NOT NULL,
  part            TEXT,
  page            TEXT,
  "column"        TEXT,
  paragraph       TEXT,
  match_status    TEXT NOT NULL DEFAULT 'UNVERIFIED'
                    CHECK (match_status IN ('VERIFIED', 'UNVERIFIED', 'FAILED')),
  confidence      NUMERIC(5, 4),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_citations_lesson_id ON lesson_citations(lesson_id);

-- 7. Add published_run_id FK now that lesson_pipeline_runs exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lessons_published_run_id_fkey'
      AND table_name = 'lessons'
  ) THEN
    ALTER TABLE lessons
      ADD CONSTRAINT lessons_published_run_id_fkey
      FOREIGN KEY (published_run_id) REFERENCES lesson_pipeline_runs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lessons_published_run_id ON lessons(published_run_id);

-- 8. RLS — enable on all tables
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_pipeline_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_citations ENABLE ROW LEVEL SECURITY;

-- 9. RLS policies — drop-if-exists then create for full idempotency
DROP POLICY IF EXISTS "lessons_tenant_isolation" ON lessons;
CREATE POLICY "lessons_tenant_isolation" ON lessons
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

DROP POLICY IF EXISTS "lesson_assets_isolation" ON lesson_assets;
CREATE POLICY "lesson_assets_isolation" ON lesson_assets
  USING (
    lesson_id IN (
      SELECT id FROM lessons
      WHERE tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );

DROP POLICY IF EXISTS "lesson_pipelines_isolation" ON lesson_pipelines;
CREATE POLICY "lesson_pipelines_isolation" ON lesson_pipelines
  USING (
    lesson_id IN (
      SELECT id FROM lessons
      WHERE tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );

DROP POLICY IF EXISTS "lesson_pipeline_runs_isolation" ON lesson_pipeline_runs;
CREATE POLICY "lesson_pipeline_runs_isolation" ON lesson_pipeline_runs
  USING (
    pipeline_id IN (
      SELECT lp.id FROM lesson_pipelines lp
      JOIN lessons l ON l.id = lp.lesson_id
      WHERE l.tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );

DROP POLICY IF EXISTS "lesson_pipeline_results_isolation" ON lesson_pipeline_results;
CREATE POLICY "lesson_pipeline_results_isolation" ON lesson_pipeline_results
  USING (
    run_id IN (
      SELECT lpr.id FROM lesson_pipeline_runs lpr
      JOIN lesson_pipelines lp ON lp.id = lpr.pipeline_id
      JOIN lessons l ON l.id = lp.lesson_id
      WHERE l.tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );

DROP POLICY IF EXISTS "lesson_citations_isolation" ON lesson_citations;
CREATE POLICY "lesson_citations_isolation" ON lesson_citations
  USING (
    lesson_id IN (
      SELECT id FROM lessons
      WHERE tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );
