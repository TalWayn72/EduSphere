-- Migration: 0053_polished_transcript
-- Smart Transcript Polishing — 4 new tables:
--   instructor_voice_profiles, polished_transcripts,
--   polished_transcript_blocks, polished_block_changes

-- ─── instructor_voice_profiles ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "instructor_voice_profiles" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"           uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "instructor_id"       uuid NOT NULL REFERENCES "users"("id"),
  "voice_data"          jsonb,
  "sample_count"        integer NOT NULL DEFAULT 1,
  "last_updated_from"   uuid REFERENCES "lessons"("id") ON DELETE SET NULL,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_voice_profile_tenant_instructor" UNIQUE ("tenant_id", "instructor_id")
);

CREATE INDEX IF NOT EXISTS "idx_voice_profiles_tenant"
  ON "instructor_voice_profiles" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_voice_profiles_instructor"
  ON "instructor_voice_profiles" ("instructor_id");

ALTER TABLE "instructor_voice_profiles" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instructor_voice_profiles_tenant_isolation"
  ON "instructor_voice_profiles";

CREATE POLICY "instructor_voice_profiles_tenant_isolation"
  ON "instructor_voice_profiles"
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- ─── polished_transcripts ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "polished_transcripts" (
  "id"                      uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"               uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "lesson_id"               uuid NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "version"                 integer NOT NULL DEFAULT 1,
  "status"                  text NOT NULL DEFAULT 'PROCESSING'
    CHECK (status IN ('PROCESSING','DRAFT','INSTRUCTOR_REVIEW','APPROVED','PUBLISHED')),
  "full_text"               text,
  "voice_profile_snapshot"  jsonb,
  "coverage_score"          numeric(5,4),
  "polished_by"             text NOT NULL DEFAULT 'AI',
  "approved_by"             uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at"             timestamptz,
  "metadata"                jsonb NOT NULL DEFAULT '{}',
  "created_at"              timestamptz NOT NULL DEFAULT now(),
  "updated_at"              timestamptz NOT NULL DEFAULT now(),
  "deleted_at"              timestamptz,
  CONSTRAINT "uq_polished_transcript_lesson_version" UNIQUE ("lesson_id", "version")
);

CREATE INDEX IF NOT EXISTS "idx_polished_transcripts_tenant"
  ON "polished_transcripts" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_polished_transcripts_lesson"
  ON "polished_transcripts" ("lesson_id");

CREATE INDEX IF NOT EXISTS "idx_polished_transcripts_status"
  ON "polished_transcripts" ("status");

ALTER TABLE "polished_transcripts" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "polished_transcripts_tenant_isolation"
  ON "polished_transcripts";

CREATE POLICY "polished_transcripts_tenant_isolation"
  ON "polished_transcripts"
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- ─── polished_transcript_blocks ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "polished_transcript_blocks" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "polished_id"         uuid NOT NULL REFERENCES "polished_transcripts"("id") ON DELETE CASCADE,
  "block_type"          text
    CHECK (block_type IN ('POLISHED_TEXT','POLISHED_CITATION','POLISHED_HEADING')),
  "block_order"         integer NOT NULL DEFAULT 0,
  "content"             text NOT NULL,
  "original_text"       text,
  "start_time"          numeric(10,3),
  "end_time"            numeric(10,3),
  "source_segment_ids"  jsonb NOT NULL DEFAULT '[]',
  "instructor_edited"   boolean NOT NULL DEFAULT false,
  "instructor_text"     text,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_polished_blocks_polished_id"
  ON "polished_transcript_blocks" ("polished_id");

CREATE INDEX IF NOT EXISTS "idx_polished_blocks_order"
  ON "polished_transcript_blocks" ("polished_id", "block_order");

-- Note: No direct tenant_id — RLS isolation is inherited via polished_transcripts FK cascade.

-- ─── polished_block_changes ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "polished_block_changes" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "block_id"              uuid NOT NULL REFERENCES "polished_transcript_blocks"("id") ON DELETE CASCADE,
  "change_type"           text
    CHECK (change_type IN (
      'FILLER_REMOVED','REPETITION_REMOVED','AUDIENCE_ADDRESS_REMOVED',
      'IMPERATIVE_TO_DESCRIPTION','RHETORICAL_SIMPLIFIED','PERSON_CHANGED',
      'CITATION_FORMATTED','SPELLING_CORRECTED','SENTENCE_RESTRUCTURED'
    )),
  "original_fragment"     text NOT NULL,
  "replacement_fragment"  text,
  "char_offset_start"     integer NOT NULL,
  "char_offset_end"       integer NOT NULL,
  "status"                text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACCEPTED','REJECTED')),
  "reviewed_at"           timestamptz,
  "created_at"            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_polished_changes_block_id"
  ON "polished_block_changes" ("block_id");

CREATE INDEX IF NOT EXISTS "idx_polished_changes_status"
  ON "polished_block_changes" ("status");

-- Note: No direct tenant_id — isolation inherited via polished_transcript_blocks → polished_transcripts cascade.
