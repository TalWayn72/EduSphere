-- Migration 0021: Course Lesson Builder (Phase 36)
-- Distinct from lesson_pipelines (AI processing). This models ordered
-- WYSIWYG content steps: VIDEO, QUIZ, DISCUSSION, AI_CHAT, SUMMARY.

DO $$ BEGIN
  CREATE TYPE course_lesson_plan_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE lesson_step_type AS ENUM ('VIDEO', 'QUIZ', 'DISCUSSION', 'AI_CHAT', 'SUMMARY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS course_lesson_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL,
  tenant_id     UUID NOT NULL,
  title         TEXT NOT NULL,
  status        course_lesson_plan_status NOT NULL DEFAULT 'DRAFT',
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_lesson_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES course_lesson_plans(id) ON DELETE CASCADE,
  step_type   lesson_step_type NOT NULL,
  step_order  INTEGER NOT NULL DEFAULT 0,
  config      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_course  ON course_lesson_plans(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_tenant  ON course_lesson_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lesson_steps_plan    ON course_lesson_steps(plan_id);

-- RLS
ALTER TABLE course_lesson_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lesson_steps  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_plans_tenant_isolation" ON course_lesson_plans
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY "lesson_steps_plan_isolation" ON course_lesson_steps
  USING (
    plan_id IN (
      SELECT id FROM course_lesson_plans
      WHERE tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );
