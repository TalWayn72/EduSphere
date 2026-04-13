-- Migration: 0052_live_stream_schema
-- Phase 1 — Live Lesson Streaming: session configs, chat, reactions, Q&A, presence, bookmarks,
-- transcript segments, QA upvotes

-- ─── live_session_configs ─────────────────────────────────────────────────
-- Extended stream configuration per live session (stream type, LiveKit, recording, lesson link).
CREATE TABLE IF NOT EXISTS "live_session_configs" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"        uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "session_id"       uuid NOT NULL REFERENCES "live_sessions"("id") ON DELETE CASCADE,
  "stream_type"      text NOT NULL DEFAULT 'BBB',
  "stream_url"       text,
  "livekit_room_id"  text,
  "recording_key"    text,
  "lesson_id"        uuid REFERENCES "lessons"("id") ON DELETE SET NULL,
  "instructor_id"    uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "viewer_count"     integer NOT NULL DEFAULT 0,
  "max_viewers"      integer NOT NULL DEFAULT 0,
  "auto_record"      boolean NOT NULL DEFAULT true,
  "is_screen_sharing" boolean NOT NULL DEFAULT false,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "live_session_configs_session_unique" UNIQUE ("session_id")
);

ALTER TABLE "live_session_configs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_session_configs_tenant_isolation" ON "live_session_configs";
CREATE POLICY "live_session_configs_tenant_isolation"
  ON "live_session_configs"
  USING  (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_live_session_configs_tenant"
  ON "live_session_configs" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_live_session_configs_session"
  ON "live_session_configs" ("session_id");

-- ─── live_chat_messages ───────────────────────────────────────────────────
-- message_type: TEXT | REACTION | SYSTEM | PINNED
CREATE TABLE IF NOT EXISTS "live_chat_messages" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"    uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "session_id"   uuid NOT NULL,
  "user_id"      uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content"      text NOT NULL,
  "message_type" text NOT NULL DEFAULT 'TEXT',
  "reply_to_id"  uuid,
  "is_pinned"    boolean NOT NULL DEFAULT false,
  "is_deleted"   boolean NOT NULL DEFAULT false,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_at"   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "live_chat_messages" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_chat_messages_tenant_isolation" ON "live_chat_messages";
CREATE POLICY "live_chat_messages_tenant_isolation"
  ON "live_chat_messages"
  USING  (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_live_chat_session_created"
  ON "live_chat_messages" ("session_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_live_chat_session_user"
  ON "live_chat_messages" ("session_id", "user_id");

-- ─── live_reactions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "live_reactions" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"  uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "session_id" uuid NOT NULL,
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "emoji"      text NOT NULL,
  "stream_ts"  numeric(10,3),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "live_reactions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_reactions_tenant_isolation" ON "live_reactions";
CREATE POLICY "live_reactions_tenant_isolation"
  ON "live_reactions"
  USING  (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_live_reactions_session_ts"
  ON "live_reactions" ("session_id", "stream_ts");
CREATE INDEX IF NOT EXISTS "idx_live_reactions_session_user"
  ON "live_reactions" ("session_id", "user_id");

-- ─── live_qa_questions ────────────────────────────────────────────────────
-- status: PENDING | ANSWERED | DISMISSED
CREATE TABLE IF NOT EXISTS "live_qa_questions" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"   uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "session_id"  uuid NOT NULL,
  "user_id"     uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "question"    text NOT NULL,
  "upvotes"     integer NOT NULL DEFAULT 0,
  "status"      text NOT NULL DEFAULT 'PENDING',
  "answer"      text,
  "stream_ts"   numeric(10,3),
  "answered_at" timestamptz,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "updated_at"  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "live_qa_questions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_qa_questions_tenant_isolation" ON "live_qa_questions";
CREATE POLICY "live_qa_questions_tenant_isolation"
  ON "live_qa_questions"
  USING  (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_live_qa_session_status"
  ON "live_qa_questions" ("session_id", "status");
CREATE INDEX IF NOT EXISTS "idx_live_qa_session_created"
  ON "live_qa_questions" ("session_id", "created_at");

-- ─── live_session_presence ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "live_session_presence" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"  uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "session_id" uuid NOT NULL,
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "joined_at"  timestamptz NOT NULL DEFAULT now(),
  "left_at"    timestamptz,
  "is_active"  boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "live_session_presence_session_user_unique"
    UNIQUE ("session_id", "user_id")
);

ALTER TABLE "live_session_presence" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_session_presence_tenant_isolation" ON "live_session_presence";
CREATE POLICY "live_session_presence_tenant_isolation"
  ON "live_session_presence"
  USING  (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_live_presence_session_active"
  ON "live_session_presence" ("session_id", "is_active");

-- ─── live_bookmarks ───────────────────────────────────────────────────────
-- RLS: users see own bookmarks; instructors/admins see all.
CREATE TABLE IF NOT EXISTS "live_bookmarks" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"  uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "session_id" uuid NOT NULL,
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "stream_ts"  numeric(10,3) NOT NULL,
  "label"      text,
  "note"       text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "live_bookmarks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_bookmarks_tenant_isolation" ON "live_bookmarks";
CREATE POLICY "live_bookmarks_tenant_isolation"
  ON "live_bookmarks"
  USING  (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

DROP POLICY IF EXISTS "live_bookmarks_user_isolation" ON "live_bookmarks";
CREATE POLICY "live_bookmarks_user_isolation"
  ON "live_bookmarks"
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR current_setting('app.current_user_role', TRUE)
      IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
  );

CREATE INDEX IF NOT EXISTS "idx_live_bookmarks_session_user"
  ON "live_bookmarks" ("session_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_live_bookmarks_user_ts"
  ON "live_bookmarks" ("user_id", "stream_ts");

-- ─── live_transcript_segments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "live_transcript_segments" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"      uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "session_id"     uuid NOT NULL,
  "segment_index"  integer NOT NULL,
  "text"           text NOT NULL,
  "start_time"     numeric(10,3),
  "end_time"       numeric(10,3),
  "is_final"       boolean NOT NULL DEFAULT false,
  "speaker"        text,
  "jargon_hits"    jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at"     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "live_transcript_segments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_transcript_segments_tenant_isolation" ON "live_transcript_segments";
CREATE POLICY "live_transcript_segments_tenant_isolation"
  ON "live_transcript_segments"
  USING  (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_live_transcript_session_index"
  ON "live_transcript_segments" ("session_id", "segment_index");
CREATE INDEX IF NOT EXISTS "idx_live_transcript_session_time"
  ON "live_transcript_segments" ("session_id", "start_time");

-- ─── live_qa_upvotes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "live_qa_upvotes" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"   uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "question_id" uuid NOT NULL REFERENCES "live_qa_questions"("id") ON DELETE CASCADE,
  "user_id"     uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "live_qa_upvotes_question_user_unique"
    UNIQUE ("question_id", "user_id")
);

ALTER TABLE "live_qa_upvotes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_qa_upvotes_tenant_isolation" ON "live_qa_upvotes";
CREATE POLICY "live_qa_upvotes_tenant_isolation"
  ON "live_qa_upvotes"
  USING  (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_live_qa_upvotes_question"
  ON "live_qa_upvotes" ("question_id");
