-- Phase 65: Pipeline Enhancement — ROLLBACK
-- Reverses migration 0034 in exact reverse order

-- 3. Remove published run reference from lessons
DROP INDEX IF EXISTS idx_lessons_published_run_id;
ALTER TABLE lessons DROP COLUMN IF EXISTS published_run_id;

-- 2. Drop pipeline templates table and RLS policies
DROP POLICY IF EXISTS modify_templates ON lesson_pipeline_templates;
DROP POLICY IF EXISTS select_templates ON lesson_pipeline_templates;
DROP TABLE IF EXISTS lesson_pipeline_templates;

-- 1. Remove versioning columns from runs
ALTER TABLE lesson_pipeline_runs DROP CONSTRAINT IF EXISTS uq_runs_lesson_run_number;
ALTER TABLE lesson_pipeline_runs DROP COLUMN IF EXISTS triggered_by;
ALTER TABLE lesson_pipeline_runs DROP COLUMN IF EXISTS run_number;
ALTER TABLE lesson_pipeline_runs DROP COLUMN IF EXISTS lesson_id;
