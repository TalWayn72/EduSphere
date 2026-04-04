-- P1-03 / P1-04 post-processing: visual_anchors columns + FK constraint.
-- Runs after 0016_visual_anchoring.sql (which creates visual_anchors).
-- The enriched_transcript_blocks table was created in Drizzle migration 0010
-- without the visual_anchors FK; that FK is added here idempotently.
ALTER TABLE "visual_anchors" ADD COLUMN IF NOT EXISTS "start_time" numeric(10, 3);
ALTER TABLE "visual_anchors" ADD COLUMN IF NOT EXISTS "end_time" numeric(10, 3);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'enriched_transcript_blocks_anchor_id_visual_anchors_id_fk'
  ) THEN
    ALTER TABLE "enriched_transcript_blocks"
      ADD CONSTRAINT "enriched_transcript_blocks_anchor_id_visual_anchors_id_fk"
      FOREIGN KEY ("anchor_id") REFERENCES "public"."visual_anchors"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END;
$$;
