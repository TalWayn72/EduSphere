import {
  pgTable,
  text,
  uuid,
  jsonb,
  integer,
  numeric,
  boolean,
  index,
  pgPolicy,
  uniqueIndex,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId, timestamps } from './_shared';
import { tenants } from './tenants';
import { users } from './core';
import { lessons } from './lesson';

// ─── Instructor Voice Profiles ────────────────────────────────────────────────
// Captures per-instructor writing style for AI-driven transcript polishing.
// Unique per (tenant, instructor) — updated as more lessons are processed.
export const instructor_voice_profiles = pgTable(
  'instructor_voice_profiles',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    instructor_id: uuid('instructor_id')
      .notNull()
      .references(() => users.id),
    voice_data: jsonb('voice_data'),
    sample_count: integer('sample_count').notNull().default(1),
    last_updated_from: uuid('last_updated_from').references(() => lessons.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uq_voice_profile_tenant_instructor').on(
      t.tenant_id,
      t.instructor_id,
    ),
    index('idx_voice_profiles_tenant').on(t.tenant_id),
    index('idx_voice_profiles_instructor').on(t.instructor_id),
    pgPolicy('instructor_voice_profiles_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ],
).enableRLS();

export type InstructorVoiceProfile =
  typeof instructor_voice_profiles.$inferSelect;
export type NewInstructorVoiceProfile =
  typeof instructor_voice_profiles.$inferInsert;

// ─── Polished Transcripts ─────────────────────────────────────────────────────
// A versioned, AI-polished transcript for a lesson.
// Status flows: PROCESSING → DRAFT → INSTRUCTOR_REVIEW → APPROVED → PUBLISHED
export const polished_transcripts = pgTable(
  'polished_transcripts',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    lesson_id: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    status: text('status', {
      enum: [
        'PROCESSING',
        'DRAFT',
        'INSTRUCTOR_REVIEW',
        'APPROVED',
        'PUBLISHED',
      ],
    })
      .notNull()
      .default('PROCESSING'),
    full_text: text('full_text'),
    voice_profile_snapshot: jsonb('voice_profile_snapshot'),
    coverage_score: numeric('coverage_score', { precision: 5, scale: 4 }),
    polished_by: text('polished_by').notNull().default('AI'),
    approved_by: uuid('approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    approved_at: timestamp('approved_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    ...timestamps,
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('uq_polished_transcript_lesson_version').on(
      t.lesson_id,
      t.version,
    ),
    index('idx_polished_transcripts_tenant').on(t.tenant_id),
    index('idx_polished_transcripts_lesson').on(t.lesson_id),
    index('idx_polished_transcripts_status').on(t.status),
    pgPolicy('polished_transcripts_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ],
).enableRLS();

export type PolishedTranscript = typeof polished_transcripts.$inferSelect;
export type NewPolishedTranscript = typeof polished_transcripts.$inferInsert;

// ─── Polished Transcript Blocks ───────────────────────────────────────────────
// Ordered blocks composing a polished transcript.
// Tracks original text alongside polished content for diff/review UI.
export const polished_transcript_blocks = pgTable(
  'polished_transcript_blocks',
  {
    id: pk(),
    polished_id: uuid('polished_id')
      .notNull()
      .references(() => polished_transcripts.id, { onDelete: 'cascade' }),
    block_type: text('block_type', {
      enum: ['POLISHED_TEXT', 'POLISHED_CITATION', 'POLISHED_HEADING'],
    }),
    block_order: integer('block_order').notNull().default(0),
    content: text('content').notNull(),
    original_text: text('original_text'),
    start_time: numeric('start_time', { precision: 10, scale: 3 }),
    end_time: numeric('end_time', { precision: 10, scale: 3 }),
    source_segment_ids: jsonb('source_segment_ids').notNull().default([]),
    instructor_edited: boolean('instructor_edited').notNull().default(false),
    instructor_text: text('instructor_text'),
    ...timestamps,
  },
  (t) => [
    index('idx_polished_blocks_polished_id').on(t.polished_id),
    index('idx_polished_blocks_order').on(t.polished_id, t.block_order),
  ],
);

export type PolishedTranscriptBlock =
  typeof polished_transcript_blocks.$inferSelect;
export type NewPolishedTranscriptBlock =
  typeof polished_transcript_blocks.$inferInsert;

// ─── Polished Block Changes (Track Changes) ───────────────────────────────────
// Granular record of every AI edit within a polished block.
// Supports accept/reject workflow for instructor review.
export const polished_block_changes = pgTable(
  'polished_block_changes',
  {
    id: pk(),
    block_id: uuid('block_id')
      .notNull()
      .references(() => polished_transcript_blocks.id, { onDelete: 'cascade' }),
    change_type: text('change_type', {
      enum: [
        'FILLER_REMOVED',
        'REPETITION_REMOVED',
        'AUDIENCE_ADDRESS_REMOVED',
        'IMPERATIVE_TO_DESCRIPTION',
        'RHETORICAL_SIMPLIFIED',
        'PERSON_CHANGED',
        'CITATION_FORMATTED',
        'SPELLING_CORRECTED',
        'SENTENCE_RESTRUCTURED',
      ],
    }),
    original_fragment: text('original_fragment').notNull(),
    replacement_fragment: text('replacement_fragment'),
    char_offset_start: integer('char_offset_start').notNull(),
    char_offset_end: integer('char_offset_end').notNull(),
    status: text('status', {
      enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    })
      .notNull()
      .default('PENDING'),
    reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_polished_changes_block_id').on(t.block_id),
    index('idx_polished_changes_status').on(t.status),
  ],
);

export type PolishedBlockChange = typeof polished_block_changes.$inferSelect;
export type NewPolishedBlockChange = typeof polished_block_changes.$inferInsert;
