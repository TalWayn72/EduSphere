-- Migration 0020: User XP and Gamification (Phase 36)

DO $$ BEGIN
  CREATE TYPE xp_event_type AS ENUM (
    'LESSON_COMPLETED',
    'QUIZ_PASSED',
    'STREAK_BONUS',
    'COURSE_COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS user_xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  event_type xp_event_type NOT NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_xp_totals (
  user_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON user_xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_tenant ON user_xp_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xp_totals_tenant ON user_xp_totals(tenant_id);

ALTER TABLE user_xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp_totals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "xp_events_user_isolation" ON user_xp_events
    USING (
      user_id::text = current_setting('app.current_user_id', TRUE)
      OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "xp_totals_user_isolation" ON user_xp_totals
    USING (
      user_id::text = current_setting('app.current_user_id', TRUE)
      OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;
