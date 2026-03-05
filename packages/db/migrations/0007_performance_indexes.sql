-- Composite indexes for frequent query patterns
-- Migration: 0007_performance_indexes
-- Purpose: Add missing composite indexes identified during performance analysis

-- Annotations: tenant + asset + layer (most common filter pattern)
CREATE INDEX IF NOT EXISTS idx_annotations_tenant_asset_layer
  ON annotations(tenant_id, asset_id, layer) WHERE deleted_at IS NULL;

-- Annotations: tenant + user (personal annotation queries — complements existing idx_annotations_tenant_user)
-- Note: idx_annotations_tenant_user already exists (single tenant+user); this adds layer filter
CREATE INDEX IF NOT EXISTS idx_annotations_tenant_user_personal
  ON annotations(tenant_id, user_id) WHERE layer = 'PERSONAL' AND deleted_at IS NULL;

-- User courses (enrollments): user + tenant + status (multi-column filter used in course list queries)
CREATE INDEX IF NOT EXISTS idx_user_courses_user_status
  ON user_courses(user_id, status) WHERE completed_at IS NULL;

-- Transcript segments: transcript + start/end time (time-range search within a transcript)
CREATE INDEX IF NOT EXISTS idx_transcript_segments_transcript_time
  ON transcript_segments(transcript_id, start_time, end_time);

-- Lessons: course + status (lesson list queries filter by course and status)
CREATE INDEX IF NOT EXISTS idx_lessons_course_status
  ON lessons(course_id, status) WHERE deleted_at IS NULL;

-- Lessons: tenant + status (tenant-wide lesson status queries)
CREATE INDEX IF NOT EXISTS idx_lessons_tenant_status
  ON lessons(tenant_id, status) WHERE deleted_at IS NULL;
