-- Migration 0019: User Learning Velocity (Phase 35)
-- Creates user_learning_velocity table with RLS for per-user weekly activity tracking

-- ─── user_learning_velocity ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_learning_velocity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  week_start DATE NOT NULL,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  minutes_studied INTEGER NOT NULL DEFAULT 0,
  annotations_added INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_velocity_user_week
  ON user_learning_velocity(user_id, week_start);

CREATE INDEX IF NOT EXISTS idx_velocity_tenant_week
  ON user_learning_velocity(tenant_id, week_start);

ALTER TABLE user_learning_velocity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_learning_velocity_isolation" ON user_learning_velocity
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR tenant_id::text = current_setting('app.current_tenant', TRUE)
  );
