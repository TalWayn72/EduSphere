-- Phase 45: Social Learning — Peer Review + Social Feed Items + Discussion Likes
-- Migration: 0027_social_peer_review.sql
--
-- Tables:
--   peer_review_rubrics        — rubric definitions per content item (tenant-scoped)
--   peer_review_assignments    — submitter→reviewer assignments with feedback/scores
--   social_feed_items          — activity feed events (verb/object pattern)
--   discussion_message_likes   — one like per (message, user) pair
--
-- RLS:
--   peer_review_rubrics:      tenant isolation
--   peer_review_assignments:  tenant + participant isolation (SI-1: app.current_user_id)
--   social_feed_items:        tenant isolation
--   discussion_message_likes: tenant isolation

-- =============================================
-- Table: peer_review_rubrics
-- =============================================
CREATE TABLE IF NOT EXISTS "peer_review_rubrics" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"       uuid NOT NULL,
  "content_item_id" uuid NOT NULL,
  "criteria"        jsonb NOT NULL,
  "min_reviewers"   integer DEFAULT 3 NOT NULL,
  "is_anonymous"    boolean DEFAULT false NOT NULL,
  "created_at"      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_peer_rubrics_content"
  ON "peer_review_rubrics" ("content_item_id");

ALTER TABLE "peer_review_rubrics" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "peer_rubrics_tenant_isolation" ON "peer_review_rubrics"
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- =============================================
-- Table: peer_review_assignments
-- =============================================
CREATE TABLE IF NOT EXISTS "peer_review_assignments" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"        uuid NOT NULL,
  "content_item_id"  uuid NOT NULL,
  "submitter_id"     uuid NOT NULL,
  "reviewer_id"      uuid NOT NULL,
  "status"           text DEFAULT 'PENDING' NOT NULL,
  "submission_text"  text,
  "feedback"         text,
  "score"            integer,
  "submitted_at"     timestamptz,
  "created_at"       timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_peer_assignments_submitter"
  ON "peer_review_assignments" ("submitter_id");
CREATE INDEX IF NOT EXISTS "idx_peer_assignments_reviewer"
  ON "peer_review_assignments" ("reviewer_id");

ALTER TABLE "peer_review_assignments" ENABLE ROW LEVEL SECURITY;

-- SI-1 compliant: references app.current_user_id (NOT app.current_user)
CREATE POLICY "peer_assignments_rls" ON "peer_review_assignments"
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND (
      submitter_id::text = current_setting('app.current_user_id', TRUE)
      OR reviewer_id::text = current_setting('app.current_user_id', TRUE)
      OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
    )
  )
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- =============================================
-- Table: social_feed_items
-- =============================================
CREATE TABLE IF NOT EXISTS "social_feed_items" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"    uuid NOT NULL,
  "actor_id"     uuid NOT NULL,
  "verb"         text NOT NULL,
  "object_type"  text NOT NULL,
  "object_id"    uuid NOT NULL,
  "object_title" text NOT NULL,
  "created_at"   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_social_feed_actor"
  ON "social_feed_items" ("actor_id", "tenant_id");
CREATE INDEX IF NOT EXISTS "idx_social_feed_created"
  ON "social_feed_items" ("created_at");

ALTER TABLE "social_feed_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_feed_tenant_isolation" ON "social_feed_items"
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- =============================================
-- Table: discussion_message_likes
-- =============================================
CREATE TABLE IF NOT EXISTS "discussion_message_likes" (
  "message_id" uuid NOT NULL,
  "user_id"    uuid NOT NULL,
  "tenant_id"  uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "discussion_like_pkey" PRIMARY KEY ("message_id", "user_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_discussion_like_unique"
  ON "discussion_message_likes" ("message_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_discussion_likes_message"
  ON "discussion_message_likes" ("message_id");

ALTER TABLE "discussion_message_likes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_likes_tenant_isolation" ON "discussion_message_likes"
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
