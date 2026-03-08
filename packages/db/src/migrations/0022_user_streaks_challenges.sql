-- Migration 0022: User Streaks + Challenges + Challenge Progress (Phase 37)

-- Enum for challenge target types
DO $$ BEGIN
  CREATE TYPE challenge_target_type AS ENUM (
    'LESSON_COUNT', 'XP_EARNED', 'QUIZ_COUNT', 'DISCUSSION_COUNT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_streaks_isolation ON user_streaks
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR (
      tenant_id::text = current_setting('app.current_tenant', TRUE)
      AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_streaks_user_tenant ON user_streaks (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_tenant ON user_streaks (tenant_id);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_type challenge_target_type NOT NULL,
  target_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY challenges_tenant_isolation ON challenges
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE INDEX IF NOT EXISTS idx_challenges_tenant_active ON challenges (tenant_id, is_active, end_date);

-- User challenge progress table
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  current_value INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_challenge_progress_isolation ON user_challenge_progress
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR (
      tenant_id::text = current_setting('app.current_tenant', TRUE)
      AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_ucp_user_challenge ON user_challenge_progress (user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_ucp_tenant_user ON user_challenge_progress (tenant_id, user_id);
