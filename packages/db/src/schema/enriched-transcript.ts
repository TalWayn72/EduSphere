import {
  pgTable,
  text,
  uuid,
  jsonb,
  integer,
  numeric,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId, timestamps, softDelete } from './_shared';
import { tenants } from './tenants';
import { transcript_segments } from './content';
import { lessons, lesson_citations } from './lesson';
import { visualAnchors } from './visual-anchoring';

// ─── Enriched Transcript Blocks ──────────────────────────────────────────────
// Semantic blocks composing the enriched lesson transcript.
// Each block maps to a transcript segment and may reference a citation or
// visual anchor, enabling the synchronized student viewing experience.
export const enriched_transcript_blocks = pgTable(
  'enriched_transcript_blocks',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    lesson_id: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    segment_id: uuid('segment_id').references(() => transcript_segments.id, {
      onDelete: 'set null',
    }),
    block_type: text('block_type', {
      enum: ['TEXT', 'CITATION', 'VISUAL_ANCHOR', 'HEADING'],
    }).notNull(),
    block_order: integer('block_order').notNull().default(0),
    content: jsonb('content').notNull().default({}),
    citation_id: uuid('citation_id').references(() => lesson_citations.id, {
      onDelete: 'set null',
    }),
    anchor_id: uuid('anchor_id').references(() => visualAnchors.id, {
      onDelete: 'set null',
    }),
    start_time: numeric('start_time', { precision: 10, scale: 3 }),
    end_time: numeric('end_time', { precision: 10, scale: 3 }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('idx_enriched_blocks_tenant').on(t.tenant_id),
    index('idx_enriched_blocks_lesson').on(t.lesson_id),
    index('idx_enriched_blocks_lesson_order').on(t.lesson_id, t.block_order),
    index('idx_enriched_blocks_segment').on(t.segment_id),
    pgPolicy('enriched_transcript_blocks_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type EnrichedTranscriptBlock =
  typeof enriched_transcript_blocks.$inferSelect;
export type NewEnrichedTranscriptBlock =
  typeof enriched_transcript_blocks.$inferInsert;
