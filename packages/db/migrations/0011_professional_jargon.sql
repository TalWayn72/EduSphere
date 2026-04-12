-- Migration: 0011_professional_jargon.sql
-- Phase: Professional Jargon — Phase 1
-- Tables: jargon_domains, jargon_terms, jargon_term_embeddings,
--         domain_proximity, lesson_domain_assignments, jargon_occurrences

-- ─── jargon_domains ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "jargon_domains" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"        uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name"             text NOT NULL,
  "description"      text,
  "language"         text NOT NULL DEFAULT 'he',
  "parent_domain_id" uuid,
  "metadata"         jsonb NOT NULL DEFAULT '{}',
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at"       timestamp with time zone,
  CONSTRAINT "jargon_domains_tenant_name_unique" UNIQUE ("tenant_id", "name")
);

ALTER TABLE "jargon_domains" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jargon_domains_tenant_isolation"
  ON "jargon_domains"
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_jargon_domains_tenant"      ON "jargon_domains" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_jargon_domains_tenant_name" ON "jargon_domains" ("tenant_id", "name");

-- ─── jargon_terms ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "jargon_terms" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"        uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "domain_id"        uuid NOT NULL REFERENCES "jargon_domains"("id") ON DELETE CASCADE,
  "canonical_form"   text NOT NULL,
  "phonetic_hint"    text,
  "alt_forms"        jsonb NOT NULL DEFAULT '[]',
  "definition_short" text,
  "definition_full"  text,
  "language"         text NOT NULL DEFAULT 'he',
  "source"           text NOT NULL DEFAULT 'AUTO' CHECK ("source" IN ('AUTO', 'MANUAL', 'IMPORTED')),
  "confidence"       numeric(5, 4),
  "graph_term_id"    text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at"       timestamp with time zone,
  CONSTRAINT "jargon_terms_tenant_domain_form_unique" UNIQUE ("tenant_id", "domain_id", "canonical_form")
);

ALTER TABLE "jargon_terms" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jargon_terms_tenant_isolation"
  ON "jargon_terms"
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_jargon_terms_tenant" ON "jargon_terms" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_jargon_terms_domain"  ON "jargon_terms" ("domain_id");

-- ─── jargon_term_embeddings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "jargon_term_embeddings" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "term_id"    uuid NOT NULL UNIQUE REFERENCES "jargon_terms"("id") ON DELETE CASCADE,
  "embedding"  vector(768) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "jargon_term_embeddings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jargon_term_embeddings_rls"
  ON "jargon_term_embeddings"
  USING (
    EXISTS (
      SELECT 1 FROM jargon_terms jt
      WHERE jt.id = term_id
        AND jt.tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );

CREATE INDEX IF NOT EXISTS "idx_jargon_term_embeddings_term" ON "jargon_term_embeddings" ("term_id");

CREATE INDEX IF NOT EXISTS "idx_jargon_term_embeddings_hnsw"
  ON "jargon_term_embeddings" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 128);

-- ─── domain_proximity ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "domain_proximity" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"       uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "domain_a_id"     uuid NOT NULL REFERENCES "jargon_domains"("id") ON DELETE CASCADE,
  "domain_b_id"     uuid NOT NULL REFERENCES "jargon_domains"("id") ON DELETE CASCADE,
  "proximity_score" numeric(5, 4) NOT NULL,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "domain_proximity_tenant_pair_unique" UNIQUE ("tenant_id", "domain_a_id", "domain_b_id")
);

ALTER TABLE "domain_proximity" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "domain_proximity_tenant_isolation"
  ON "domain_proximity"
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_domain_proximity_tenant"   ON "domain_proximity" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_domain_proximity_domain_a" ON "domain_proximity" ("domain_a_id");

-- ─── lesson_domain_assignments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "lesson_domain_assignments" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lesson_id"        uuid NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "domain_id"        uuid NOT NULL REFERENCES "jargon_domains"("id") ON DELETE CASCADE,
  "detection_method" text NOT NULL CHECK ("detection_method" IN ('AUTO', 'INSTRUCTOR_CONFIRMED', 'MANUAL')),
  "confidence"       numeric(5, 4),
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "lesson_domain_assignments_lesson_domain_unique" UNIQUE ("lesson_id", "domain_id")
);

ALTER TABLE "lesson_domain_assignments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_domain_assignments_rls"
  ON "lesson_domain_assignments"
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_id
        AND l.tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );

CREATE INDEX IF NOT EXISTS "idx_lesson_domain_assignments_lesson" ON "lesson_domain_assignments" ("lesson_id");
CREATE INDEX IF NOT EXISTS "idx_lesson_domain_assignments_domain" ON "lesson_domain_assignments" ("domain_id");

-- ─── jargon_occurrences ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "jargon_occurrences" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lesson_id"      uuid NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "term_id"        uuid NOT NULL REFERENCES "jargon_terms"("id") ON DELETE CASCADE,
  "segment_id"     uuid REFERENCES "transcript_segments"("id") ON DELETE SET NULL,
  "block_id"       uuid REFERENCES "enriched_transcript_blocks"("id") ON DELETE SET NULL,
  "start_time"     numeric(10, 3),
  "end_time"       numeric(10, 3),
  "original_text"  text NOT NULL,
  "corrected_text" text,
  "confidence"     numeric(5, 4),
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "jargon_occurrences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jargon_occurrences_rls"
  ON "jargon_occurrences"
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_id
        AND l.tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );

CREATE INDEX IF NOT EXISTS "idx_jargon_occurrences_lesson_term" ON "jargon_occurrences" ("lesson_id", "term_id");
CREATE INDEX IF NOT EXISTS "idx_jargon_occurrences_lesson"      ON "jargon_occurrences" ("lesson_id");
CREATE INDEX IF NOT EXISTS "idx_jargon_occurrences_term"        ON "jargon_occurrences" ("term_id");
