-- Migration 0011: user_skill_mastery table for KnowledgeSkillTree mastery tracking
-- Applied: Session 26 — Learning Loop integration

CREATE TABLE IF NOT EXISTS user_skill_mastery (
  user_id     UUID NOT NULL,
  tenant_id   UUID NOT NULL,
  concept_id  UUID NOT NULL,
  mastery_level TEXT NOT NULL DEFAULT 'NONE'
    CHECK (mastery_level IN ('NONE', 'ATTEMPTED', 'FAMILIAR', 'PROFICIENT', 'MASTERED')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tenant_id, concept_id)
);

-- RLS
ALTER TABLE user_skill_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS user_skill_mastery_tenant_isolation
  ON user_skill_mastery
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant', TRUE)::uuid
    AND user_id = current_setting('app.current_user_id', TRUE)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant', TRUE)::uuid
    AND user_id = current_setting('app.current_user_id', TRUE)::uuid
  );

-- Index for fast lookup by user+tenant
CREATE INDEX IF NOT EXISTS idx_user_skill_mastery_user_tenant
  ON user_skill_mastery (user_id, tenant_id);

-- Index for lookup by concept (for skill tree rendering)
CREATE INDEX IF NOT EXISTS idx_user_skill_mastery_concept
  ON user_skill_mastery (tenant_id, concept_id);
