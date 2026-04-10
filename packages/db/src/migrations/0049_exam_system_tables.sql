-- Migration 0049: Exam System Tables
-- Creates exam_blueprints, exam_items, exam_item_embeddings,
-- exam_sessions, exam_responses, exam_results, item_response_log
-- These tables are defined in the Drizzle schema but were never migrated.

-- ── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE passing_method AS ENUM ('PERCENTAGE', 'SCALED_SCORE', 'IRT_THETA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE blueprint_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bloom_level AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE calibration_status AS ENUM ('DRAFT', 'PILOT', 'CALIBRATED', 'RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE exam_item_source AS ENUM ('MANUAL', 'AI_GENERATED', 'IMPORTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quality_tier AS ENUM ('AI_GENERATED', 'SME_REVIEWED', 'PILOT_TESTED', 'CALIBRATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE exam_session_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'SUBMITTED', 'GRADED', 'TIMED_OUT', 'VOIDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── exam_blueprints ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "exam_blueprints" (
  "id"                      uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"               uuid NOT NULL,
  "course_id"               uuid NOT NULL REFERENCES "courses"("id") ON DELETE cascade,
  "title"                   varchar(255) NOT NULL,
  "description"             text,
  "time_limit_minutes"      integer NOT NULL DEFAULT 120,
  "total_questions"         integer NOT NULL,
  "passing_score"           real NOT NULL DEFAULT 700,
  "passing_method"          passing_method NOT NULL DEFAULT 'SCALED_SCORE',
  "domain_distribution"     jsonb,
  "bloom_distribution"      jsonb,
  "difficulty_range"        jsonb,
  "shuffle_questions"       boolean NOT NULL DEFAULT true,
  "shuffle_answers"         boolean NOT NULL DEFAULT true,
  "max_retakes"             integer NOT NULL DEFAULT 3,
  "retake_cooldown_hours"   integer NOT NULL DEFAULT 24,
  "show_results_immediately" boolean NOT NULL DEFAULT true,
  "show_correct_answers"    boolean NOT NULL DEFAULT false,
  "is_adaptive"             boolean NOT NULL DEFAULT false,
  "cat_min_items"           integer,
  "cat_max_items"           integer,
  "cat_se_threshold"        real DEFAULT 0.3,
  "cat_confidence_threshold" real DEFAULT 0.95,
  "status"                  blueprint_status NOT NULL DEFAULT 'DRAFT',
  "version"                 integer NOT NULL DEFAULT 1,
  "created_by"              uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_exam_blueprints_tenant"  ON "exam_blueprints"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_exam_blueprints_course"  ON "exam_blueprints"("course_id");
CREATE INDEX IF NOT EXISTS "idx_exam_blueprints_status"  ON "exam_blueprints"("status");

ALTER TABLE "exam_blueprints" ENABLE ROW LEVEL SECURITY;

-- ── exam_items ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "exam_items" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"           uuid NOT NULL,
  "course_id"           uuid NOT NULL REFERENCES "courses"("id") ON DELETE cascade,
  "module_id"           uuid REFERENCES "modules"("id") ON DELETE set null,
  "domain_tag"          varchar(100),
  "bloom_level"         bloom_level NOT NULL DEFAULT 'REMEMBER',
  "question_data"       jsonb NOT NULL,
  "irt_a"               real NOT NULL DEFAULT 1.0,
  "irt_b"               real NOT NULL DEFAULT 0.0,
  "irt_c"               real NOT NULL DEFAULT 0.25,
  "calibration_status"  calibration_status NOT NULL DEFAULT 'DRAFT',
  "source"              exam_item_source NOT NULL DEFAULT 'MANUAL',
  "quality_tier"        quality_tier NOT NULL DEFAULT 'AI_GENERATED',
  "iwf_flags"           jsonb NOT NULL DEFAULT '[]',
  "p_value"             real,
  "r_pbis"              real,
  "d_index"             real,
  "distractor_stats"    jsonb,
  "exposure_count"      integer NOT NULL DEFAULT 0,
  "dif_flagged"         boolean NOT NULL DEFAULT false,
  "generation_metadata" jsonb,
  "review_notes"        text,
  "created_by"          uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at"          timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "idx_exam_items_tenant"      ON "exam_items"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_exam_items_course"      ON "exam_items"("course_id");
CREATE INDEX IF NOT EXISTS "idx_exam_items_module"      ON "exam_items"("module_id");
CREATE INDEX IF NOT EXISTS "idx_exam_items_bloom"       ON "exam_items"("bloom_level");
CREATE INDEX IF NOT EXISTS "idx_exam_items_calibration" ON "exam_items"("calibration_status");

ALTER TABLE "exam_items" ENABLE ROW LEVEL SECURITY;

-- ── exam_item_embeddings ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "exam_item_embeddings" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "item_id"    uuid NOT NULL UNIQUE REFERENCES "exam_items"("id") ON DELETE cascade,
  "embedding"  vector(768) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_exam_item_embeddings_hnsw"
  ON "exam_item_embeddings" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 32, ef_construction = 128);

ALTER TABLE "exam_item_embeddings" ENABLE ROW LEVEL SECURITY;

-- ── exam_sessions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "exam_sessions" (
  "id"                      uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"               uuid NOT NULL,
  "blueprint_id"            uuid NOT NULL REFERENCES "exam_blueprints"("id") ON DELETE cascade,
  "user_id"                 uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "status"                  exam_session_status NOT NULL DEFAULT 'SCHEDULED',
  "attempt_number"          integer NOT NULL DEFAULT 1,
  "started_at"              timestamp with time zone,
  "submitted_at"            timestamp with time zone,
  "time_remaining_seconds"  integer,
  "question_order"          jsonb,
  "option_shuffle_seeds"    jsonb,
  "is_adaptive"             boolean NOT NULL DEFAULT false,
  "cat_state"               jsonb,
  "ip_address"              text,
  "user_agent"              text,
  "browser_events"          jsonb NOT NULL DEFAULT '[]',
  "proctoring_session_id"   uuid,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_exam_sessions_tenant"    ON "exam_sessions"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_exam_sessions_user"      ON "exam_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_exam_sessions_blueprint" ON "exam_sessions"("blueprint_id");
CREATE INDEX IF NOT EXISTS "idx_exam_sessions_status"    ON "exam_sessions"("status");

ALTER TABLE "exam_sessions" ENABLE ROW LEVEL SECURITY;

-- ── exam_responses ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "exam_responses" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"     uuid NOT NULL,
  "session_id"    uuid NOT NULL REFERENCES "exam_sessions"("id") ON DELETE cascade,
  "item_id"       uuid NOT NULL REFERENCES "exam_items"("id") ON DELETE cascade,
  "answer_data"   jsonb,
  "is_correct"    boolean,
  "is_flagged"    boolean NOT NULL DEFAULT false,
  "time_spent_ms" integer,
  "answered_at"   timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "idx_exam_responses_session" ON "exam_responses"("session_id");
CREATE INDEX IF NOT EXISTS "idx_exam_responses_item"    ON "exam_responses"("item_id");
CREATE INDEX IF NOT EXISTS "idx_exam_responses_tenant"  ON "exam_responses"("tenant_id");

ALTER TABLE "exam_responses" ENABLE ROW LEVEL SECURITY;

-- ── exam_results ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "exam_results" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"           uuid NOT NULL,
  "session_id"          uuid NOT NULL UNIQUE REFERENCES "exam_sessions"("id") ON DELETE cascade,
  "blueprint_id"        uuid NOT NULL REFERENCES "exam_blueprints"("id") ON DELETE cascade,
  "user_id"             uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "raw_score"           real NOT NULL,
  "scaled_score"        integer,
  "passed"              boolean NOT NULL,
  "theta_estimate"      real,
  "sem"                 real,
  "confidence_interval" jsonb,
  "domain_scores"       jsonb,
  "bloom_scores"        jsonb,
  "item_analysis"       jsonb,
  "certificate_id"      uuid,
  "graded_at"           timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_exam_results_tenant"    ON "exam_results"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_exam_results_user"      ON "exam_results"("user_id");
CREATE INDEX IF NOT EXISTS "idx_exam_results_blueprint" ON "exam_results"("blueprint_id");
CREATE INDEX IF NOT EXISTS "idx_exam_results_passed"    ON "exam_results"("passed");

ALTER TABLE "exam_results" ENABLE ROW LEVEL SECURITY;

-- ── item_response_log (append-only psychometric data) ───────────────────────

CREATE TABLE IF NOT EXISTS "item_response_log" (
  "id"                      uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"               uuid NOT NULL,
  "item_id"                 uuid NOT NULL REFERENCES "exam_items"("id") ON DELETE cascade,
  "user_id"                 uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "is_correct"              boolean NOT NULL,
  "selected_option_index"   integer,
  "response_time_ms"        integer,
  "recorded_at"             timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_item_response_log_tenant" ON "item_response_log"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_item_response_log_item"   ON "item_response_log"("item_id");
CREATE INDEX IF NOT EXISTS "idx_item_response_log_user"   ON "item_response_log"("user_id");

ALTER TABLE "item_response_log" ENABLE ROW LEVEL SECURITY;
