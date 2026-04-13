-- Migration: 0050_glossary_wiki_tables
-- Phase 2.1 — Glossary Wiki: glossary_entries + glossary_lesson_refs
-- Requires: jargon_terms (0042), lessons (0035)

-- ─── glossary_entries ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "glossary_entries" (
  "id"                      uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"               uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "term_id"                 uuid NOT NULL UNIQUE REFERENCES "jargon_terms"("id") ON DELETE CASCADE,
  "wiki_content"            text,
  "aggregated_definition"   text,
  "aggregation_lesson_ids"  jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_published"            boolean NOT NULL DEFAULT false,
  "created_at"              timestamptz NOT NULL DEFAULT now(),
  "updated_at"              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "glossary_entries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "glossary_entries_tenant_isolation"
  ON "glossary_entries"
  USING  (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_glossary_entries_tenant"
  ON "glossary_entries" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_glossary_entries_term"
  ON "glossary_entries" ("term_id");

CREATE INDEX IF NOT EXISTS "idx_glossary_entries_tenant_published"
  ON "glossary_entries" ("tenant_id", "is_published");

-- ─── glossary_lesson_refs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "glossary_lesson_refs" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"           uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "glossary_entry_id"   uuid NOT NULL REFERENCES "glossary_entries"("id") ON DELETE CASCADE,
  "lesson_id"           uuid NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "occurrence_count"    integer NOT NULL DEFAULT 0,
  "centrality_score"    numeric(5,4) NOT NULL DEFAULT 0,
  "first_mention_time"  numeric(10,3),
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "glossary_lesson_refs_entry_lesson_unique"
    UNIQUE ("glossary_entry_id", "lesson_id")
);

ALTER TABLE "glossary_lesson_refs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "glossary_lesson_refs_tenant_isolation"
  ON "glossary_lesson_refs"
  USING  (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_glossary_lesson_refs_tenant"
  ON "glossary_lesson_refs" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_glossary_lesson_refs_entry"
  ON "glossary_lesson_refs" ("glossary_entry_id");

CREATE INDEX IF NOT EXISTS "idx_glossary_lesson_refs_lesson"
  ON "glossary_lesson_refs" ("lesson_id");
