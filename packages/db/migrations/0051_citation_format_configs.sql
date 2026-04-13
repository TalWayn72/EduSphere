-- Migration: 0051_citation_format_configs
-- Phase 3 — Citation Format: citation_format_configs table + match_status EDITED value

-- ─── citation_format_configs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "citation_format_configs" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"          uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "course_id"          uuid NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
  "preset_name"        text NOT NULL,
  "format_description" text,
  "parsed_structure"   jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_active"          boolean NOT NULL DEFAULT true,
  "created_at"         timestamptz NOT NULL DEFAULT now(),
  "updated_at"         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "citation_format_configs_tenant_course_preset_unique"
    UNIQUE ("tenant_id", "course_id", "preset_name")
);

ALTER TABLE "citation_format_configs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "citation_format_configs_tenant_isolation"
  ON "citation_format_configs"
  USING  (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_citation_format_configs_tenant"
  ON "citation_format_configs" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_citation_format_configs_course"
  ON "citation_format_configs" ("course_id");

-- ─── match_status: add EDITED value ──────────────────────────────────────────
-- lesson_citations.match_status uses a Drizzle text enum (application-level only).
-- No ALTER TYPE DDL is needed — the column is plain TEXT in PostgreSQL.
-- Adding EDITED to the Drizzle schema enum in lesson.ts is sufficient.
-- This comment documents the addition for migration tracking purposes.
