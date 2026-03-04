-- Migration: 0008_text_range_annotations
-- Purpose: Add text range columns to annotations table for Word-style
--          inline commenting (INLINE_COMMENT and SUGGESTION types)

ALTER TABLE annotations
  ADD COLUMN IF NOT EXISTS text_start INTEGER,
  ADD COLUMN IF NOT EXISTS text_end INTEGER,
  ADD COLUMN IF NOT EXISTS range_type TEXT DEFAULT 'character';

CREATE INDEX IF NOT EXISTS idx_annotations_text_range
  ON annotations(asset_id, text_start, text_end)
  WHERE text_start IS NOT NULL;
