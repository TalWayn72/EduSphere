-- P1-03: Add start_time and end_time to visual_anchors for enriched lesson timeline anchoring.
-- Runs after 0016_visual_anchoring.sql ensures the table exists.
ALTER TABLE "visual_anchors" ADD COLUMN IF NOT EXISTS "start_time" numeric(10, 3);
ALTER TABLE "visual_anchors" ADD COLUMN IF NOT EXISTS "end_time" numeric(10, 3);
