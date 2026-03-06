-- Phase 28: Rename plaintext password columns to encrypted variants (SI-3 compliance)
-- Drizzle schema was updated in Phase 27 but SQL migration was missing

ALTER TABLE live_sessions
  RENAME COLUMN attendee_password TO attendee_password_enc;

ALTER TABLE live_sessions
  RENAME COLUMN moderator_password TO moderator_password_enc;

-- Add performance index for skill mastery lookups
-- (user_skill_mastery table was added in migration 0011)
-- Note: column is concept_id (not skill_node_id) per user-skill-mastery.ts schema
CREATE INDEX IF NOT EXISTS idx_user_skill_mastery_user_skill
  ON user_skill_mastery (user_id, concept_id);

COMMENT ON COLUMN live_sessions.attendee_password_enc IS 'AES-256-GCM encrypted attendee password (SI-3)';
COMMENT ON COLUMN live_sessions.moderator_password_enc IS 'AES-256-GCM encrypted moderator password (SI-3)';
