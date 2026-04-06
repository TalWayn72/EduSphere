/**
 * Applies migration prerequisites for the enriched lesson seed:
 *   - Adds youtube_video_id column to media_assets
 *   - Creates enriched_transcript_blocks table with RLS
 */
import { Pool } from 'pg';

async function main(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://edusphere:edusphere_dev_password@localhost:5432/edusphere',
  });

  // Step 1: youtube_video_id on media_assets
  await pool.query('ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS youtube_video_id text');
  console.log('  ✓ youtube_video_id column added to media_assets');

  // Step 1b: start_time / end_time on visual_anchors (from migration 0044)
  await pool.query('ALTER TABLE visual_anchors ADD COLUMN IF NOT EXISTS start_time numeric(10, 3)');
  await pool.query('ALTER TABLE visual_anchors ADD COLUMN IF NOT EXISTS end_time numeric(10, 3)');
  console.log('  ✓ start_time/end_time columns added to visual_anchors');

  // Step 2: enriched_transcript_blocks table
  await pool.query(`
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
    )
  `);
  console.log('  ✓ enriched_transcript_blocks table created');

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_enriched_blocks_tenant ON enriched_transcript_blocks(tenant_id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_enriched_blocks_lesson ON enriched_transcript_blocks(lesson_id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_enriched_blocks_lesson_order ON enriched_transcript_blocks(lesson_id, block_order)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_enriched_blocks_segment ON enriched_transcript_blocks(segment_id)
  `);
  console.log('  ✓ Indexes created');

  await pool.query('ALTER TABLE enriched_transcript_blocks ENABLE ROW LEVEL SECURITY');
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'enriched_transcript_blocks'
        AND policyname = 'enriched_transcript_blocks_tenant_isolation'
      ) THEN
        CREATE POLICY enriched_transcript_blocks_tenant_isolation
          ON enriched_transcript_blocks
          USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
          WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
      END IF;
    END $$
  `);
  console.log('  ✓ RLS enabled and policy created');

  // Step 3: Add enriched-lesson columns to lesson_citations
  await pool.query(`ALTER TABLE lesson_citations ADD COLUMN IF NOT EXISTS knowledge_source_id uuid`);
  await pool.query(`ALTER TABLE lesson_citations ADD COLUMN IF NOT EXISTS resolved_text text`);
  await pool.query(`ALTER TABLE lesson_citations ADD COLUMN IF NOT EXISTS graph_source_id text`);
  console.log('  ✓ lesson_citations enriched columns added');

  // Mark both migrations in custom_migrations tracking table
  await pool.query(`
    INSERT INTO custom_migrations (filename)
    VALUES ('0044_enriched_lesson_visual_anchor_cols.sql'), ('0045_seed_enriched_lesson_prereqs.sql')
    ON CONFLICT (filename) DO NOTHING
  `);
  console.log('  ✓ Migration tracking updated');

  await pool.end();
  console.log('Prerequisites applied successfully.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
