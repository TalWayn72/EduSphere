-- Migration 0028: Group Challenges + KG Peer Matching
-- Phase 46: Group Challenges with leaderboard + Knowledge-Graph based peer matching
--
-- Tables:
--   group_challenges        — collaborative learning objectives (tenant-scoped)
--   challenge_participants  — scores and rankings per challenge
--   peer_match_requests     — KG-based study partner matching
--
-- RLS:
--   group_challenges:       tenant isolation (SI-1 compliant)
--   challenge_participants: tenant isolation via FK join
--   peer_match_requests:    tenant + participant isolation (SI-1: app.current_user_id)

-- =============================================
-- Table: group_challenges
-- =============================================
CREATE TABLE IF NOT EXISTS "group_challenges" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"        uuid NOT NULL,
  "title"            varchar(200) NOT NULL,
  "description"      text,
  "course_id"        uuid,
  "challenge_type"   varchar(20) NOT NULL DEFAULT 'QUIZ',
  "target_score"     integer NOT NULL DEFAULT 100,
  "start_date"       timestamptz NOT NULL,
  "end_date"         timestamptz NOT NULL,
  "max_participants" integer NOT NULL DEFAULT 50,
  "status"           varchar(20) NOT NULL DEFAULT 'DRAFT',
  "created_by"       uuid NOT NULL,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "group_challenges" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_tenant_isolation" ON "group_challenges"
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS "idx_challenges_tenant_status"
  ON "group_challenges" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_challenges_course"
  ON "group_challenges" ("course_id");

-- =============================================
-- Table: challenge_participants
-- =============================================
CREATE TABLE IF NOT EXISTS "challenge_participants" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "challenge_id" uuid NOT NULL REFERENCES "group_challenges" ("id") ON DELETE CASCADE,
  "user_id"      uuid NOT NULL,
  "score"        integer NOT NULL DEFAULT 0,
  "rank"         integer,
  "joined_at"    timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz,
  CONSTRAINT "uq_challenge_participant" UNIQUE ("challenge_id", "user_id")
);

ALTER TABLE "challenge_participants" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_isolation" ON "challenge_participants"
  USING (EXISTS (
    SELECT 1 FROM group_challenges gc
    WHERE gc.id = challenge_id
    AND gc.tenant_id::text = current_setting('app.current_tenant', TRUE)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM group_challenges gc
    WHERE gc.id = challenge_id
    AND gc.tenant_id::text = current_setting('app.current_tenant', TRUE)
  ));

CREATE INDEX IF NOT EXISTS "idx_challenge_participants_challenge"
  ON "challenge_participants" ("challenge_id");
CREATE INDEX IF NOT EXISTS "idx_challenge_participants_user"
  ON "challenge_participants" ("user_id");

-- =============================================
-- Table: peer_match_requests
-- =============================================
CREATE TABLE IF NOT EXISTS "peer_match_requests" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"       uuid NOT NULL,
  "requester_id"    uuid NOT NULL,
  "matched_user_id" uuid NOT NULL,
  "course_id"       uuid,
  "match_reason"    text,
  "status"          varchar(20) NOT NULL DEFAULT 'PENDING',
  "created_at"      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "peer_match_requests" ENABLE ROW LEVEL SECURITY;

-- SI-1 compliant: references app.current_user_id (NOT app.current_user)
CREATE POLICY "peer_match_rls" ON "peer_match_requests"
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND (
      requester_id::text = current_setting('app.current_user_id', TRUE)
      OR matched_user_id::text = current_setting('app.current_user_id', TRUE)
    )
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND requester_id::text = current_setting('app.current_user_id', TRUE)
  );

CREATE INDEX IF NOT EXISTS "idx_peer_match_tenant"
  ON "peer_match_requests" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_peer_match_requester"
  ON "peer_match_requests" ("requester_id");
