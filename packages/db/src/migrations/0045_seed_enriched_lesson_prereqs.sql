-- Migration 0045: Prerequisites for enriched lesson seed
-- Adds youtube_video_id to media_assets and creates enriched_transcript_blocks table.

-- 1. Add youtube_video_id column to media_assets (FEAT: Semantic-Enriched Lesson Creation)
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS youtube_video_id text;

-- 2. Create enriched_transcript_blocks table
CREATE TABLE IF NOT EXISTS enriched_transcript_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  segment_id uuid REFERENCES transcript_segments(id) ON DELETE SET NULL,
  block_type text NOT NULL CHECK (block_type IN ('TEXT', 'CITATION', 'VISUAL_ANCHOR', 'HEADING')),
  block_order integer NOT NULL DEFAULT 0,
  content jsonb NOT NULL DEFAULT '{}',
  citation_id uuid REFERENCES lesson_citations(id) ON DELETE SET NULL,
  anchor_id uuid REFERENCES visual_anchors(id) ON DELETE SET NULL,
  start_time numeric(10, 3),
  end_time numeric(10, 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_enriched_blocks_tenant ON enriched_transcript_blocks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enriched_blocks_lesson ON enriched_transcript_blocks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_enriched_blocks_lesson_order ON enriched_transcript_blocks(lesson_id, block_order);
CREATE INDEX IF NOT EXISTS idx_enriched_blocks_segment ON enriched_transcript_blocks(segment_id);

ALTER TABLE enriched_transcript_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enriched_transcript_blocks_tenant_isolation" ON enriched_transcript_blocks;
CREATE POLICY "enriched_transcript_blocks_tenant_isolation" ON enriched_transcript_blocks
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
