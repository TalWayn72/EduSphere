-- Migration: create discussion tables that were missing from earlier migrations.
-- The FK constraints referencing these tables were already added in
-- 0002_aberrant_karma.sql (lines 848-853), so we must create the tables first.
-- All statements are idempotent (CREATE TABLE IF NOT EXISTS).

-- Enums (must exist before the tables that use them)
DO $$ BEGIN
  CREATE TYPE "public"."discussion_type" AS ENUM('FORUM', 'CHAVRUTA', 'DEBATE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."message_type" AS ENUM('TEXT', 'IMAGE', 'VIDEO', 'AUDIO');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- discussions (must come before discussion_messages and discussion_participants)
CREATE TABLE IF NOT EXISTS "discussions" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"       uuid NOT NULL REFERENCES "public"."tenants"("id") ON DELETE cascade,
  "course_id"       uuid NOT NULL,
  "title"           text NOT NULL,
  "description"     text,
  "creator_id"      uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "discussion_type" "public"."discussion_type" NOT NULL DEFAULT 'FORUM',
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "discussion_messages" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "discussion_id"     uuid NOT NULL REFERENCES "public"."discussions"("id") ON DELETE cascade,
  "user_id"           uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "content"           text NOT NULL,
  "message_type"      "public"."message_type" NOT NULL DEFAULT 'TEXT',
  "parent_message_id" uuid,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "discussion_participants" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "discussion_id" uuid NOT NULL REFERENCES "public"."discussions"("id") ON DELETE cascade,
  "user_id"       uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "joined_at"     timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

-- RLS
ALTER TABLE "discussions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$ BEGIN
  CREATE POLICY discussions_tenant_isolation ON "discussions"
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE));
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "discussion_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$ BEGIN
  CREATE POLICY discussion_messages_tenant_isolation ON "discussion_messages"
    USING (
      EXISTS (
        SELECT 1 FROM discussions
        WHERE discussions.id = discussion_messages.discussion_id
        AND discussions.tenant_id::text = current_setting('app.current_tenant', TRUE)
      )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "discussion_participants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$ BEGIN
  CREATE POLICY discussion_participants_tenant_isolation ON "discussion_participants"
    USING (
      EXISTS (
        SELECT 1 FROM discussions
        WHERE discussions.id = discussion_participants.discussion_id
        AND discussions.tenant_id::text = current_setting('app.current_tenant', TRUE)
      )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_discussions_course"                  ON "discussions"("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discussions_creator"                 ON "discussions"("creator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discussions_type"                    ON "discussions"("discussion_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discussion_messages_discussion"      ON "discussion_messages"("discussion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discussion_messages_user"            ON "discussion_messages"("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discussion_messages_parent"          ON "discussion_messages"("parent_message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discussion_participants_discussion"  ON "discussion_participants"("discussion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discussion_participants_user"        ON "discussion_participants"("user_id");
