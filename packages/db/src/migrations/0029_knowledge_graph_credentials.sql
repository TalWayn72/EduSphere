-- Phase 47: Knowledge Graph Credentials + Chavruta Partner Sessions + Cohort Tracking
-- SI-1: RLS session variable = app.current_user_id (NOT app.current_user)

-- 1. chavruta_partner_sessions — tracks paired Chavruta debate sessions
CREATE TABLE IF NOT EXISTS chavruta_partner_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  initiator_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  course_id UUID,
  topic TEXT NOT NULL,
  match_reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','COMPLETED','DECLINED')),
  agent_session_id UUID,  -- link to AgentSession once debate starts
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE chavruta_partner_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY chavruta_partner_sessions_tenant_isolation ON chavruta_partner_sessions
  USING (tenant_id = current_setting('app.current_tenant', TRUE)::UUID);

CREATE POLICY chavruta_partner_sessions_participant_access ON chavruta_partner_sessions
  USING (
    initiator_id::text = current_setting('app.current_user_id', TRUE)
    OR partner_id::text = current_setting('app.current_user_id', TRUE)
  );

CREATE INDEX IF NOT EXISTS idx_chavruta_partner_sessions_initiator ON chavruta_partner_sessions(initiator_id);
CREATE INDEX IF NOT EXISTS idx_chavruta_partner_sessions_partner ON chavruta_partner_sessions(partner_id);
CREATE INDEX IF NOT EXISTS idx_chavruta_partner_sessions_tenant_status ON chavruta_partner_sessions(tenant_id, status);

-- 2. knowledge_path_credentials — links badge assertions to KG path coverage
CREATE TABLE IF NOT EXISTS knowledge_path_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  badge_assertion_id UUID NOT NULL REFERENCES open_badge_assertions(id) ON DELETE CASCADE,
  concept_ids TEXT[] NOT NULL DEFAULT '{}',  -- AGE concept node IDs covered
  path_depth INT NOT NULL DEFAULT 0,         -- number of hops in concept graph
  coverage_score FLOAT NOT NULL DEFAULT 0.0, -- 0.0-1.0 fraction of required concepts mastered
  mastery_threshold FLOAT NOT NULL DEFAULT 0.7, -- minimum mastery required per concept
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

ALTER TABLE knowledge_path_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_path_credentials_tenant ON knowledge_path_credentials
  USING (tenant_id = current_setting('app.current_tenant', TRUE)::UUID);

CREATE POLICY knowledge_path_credentials_owner ON knowledge_path_credentials
  USING (user_id::text = current_setting('app.current_user_id', TRUE));

CREATE INDEX IF NOT EXISTS idx_knowledge_path_credentials_user ON knowledge_path_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_path_credentials_badge ON knowledge_path_credentials(badge_assertion_id);

-- 3. Add cohort_id to social_feed_items (nullable — backfill allowed)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='social_feed_items' AND column_name='cohort_id'
  ) THEN
    ALTER TABLE social_feed_items ADD COLUMN cohort_id UUID;
    COMMENT ON COLUMN social_feed_items.cohort_id IS 'Phase 47: links activity to a learning cohort for cross-cohort RAG retrieval';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_social_feed_items_cohort ON social_feed_items(cohort_id) WHERE cohort_id IS NOT NULL;
