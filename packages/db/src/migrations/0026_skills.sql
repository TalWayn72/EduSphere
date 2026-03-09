-- Migration 0026: Skills-Based Learning Paths (Phase 44)
--
-- Tables:
--   skills              — global skill taxonomy (tenant-independent)
--   skill_prerequisites — DAG prerequisite edges between skills
--   skill_paths         — tenant-scoped curated skill sequences
--   learner_skill_progress — per-learner mastery tracking with xAPI evidence
--
-- RLS:
--   skill_paths: tenant-scoped; write-gated to INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN
--   learner_skill_progress: tenant + user isolation (SI-1: app.current_user_id)
--   skills / skill_prerequisites: no RLS (global read-only reference data)

-- -------------------------------------------------------------------------
-- skills — global taxonomy
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  parent_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_level ON skills(level);
CREATE INDEX IF NOT EXISTS idx_skills_parent ON skills(parent_skill_id) WHERE parent_skill_id IS NOT NULL;

-- -------------------------------------------------------------------------
-- skill_prerequisites — DAG edges (global reference data, no RLS)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  prerequisite_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  CONSTRAINT skill_prerequisites_unique UNIQUE (skill_id, prerequisite_skill_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_prereqs_skill ON skill_prerequisites(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_prereqs_prereq ON skill_prerequisites(prerequisite_skill_id);

-- -------------------------------------------------------------------------
-- skill_paths — tenant-scoped curated sequences
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_role TEXT,
  skill_ids JSON NOT NULL DEFAULT '[]',
  estimated_hours INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_paths_tenant ON skill_paths(tenant_id);
CREATE INDEX IF NOT EXISTS idx_skill_paths_published ON skill_paths(tenant_id, is_published);
CREATE INDEX IF NOT EXISTS idx_skill_paths_created_by ON skill_paths(created_by);

ALTER TABLE skill_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY skill_paths_tenant_isolation ON skill_paths
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND (
      current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
    )
  );

-- -------------------------------------------------------------------------
-- learner_skill_progress — per-learner mastery + xAPI evidence
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learner_skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  mastery_level TEXT NOT NULL DEFAULT 'NONE'
    CHECK (mastery_level IN ('NONE', 'ATTEMPTED', 'FAMILIAR', 'PROFICIENT', 'MASTERED')),
  evidence_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  xapi_registration_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learner_skill_progress_unique UNIQUE (tenant_id, user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_skill_progress_user
  ON learner_skill_progress(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_learner_skill_progress_skill
  ON learner_skill_progress(tenant_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_learner_skill_progress_mastery
  ON learner_skill_progress(mastery_level);

ALTER TABLE learner_skill_progress ENABLE ROW LEVEL SECURITY;

-- SI-1 compliant: references app.current_user_id (NOT app.current_user)
CREATE POLICY learner_skill_progress_user_isolation ON learner_skill_progress
  FOR ALL
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND user_id::text = current_setting('app.current_user_id', TRUE)
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND user_id::text = current_setting('app.current_user_id', TRUE)
  );
