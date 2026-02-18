import {
  pgTable,
  text,
  uuid,
  jsonb,
  boolean,
  integer,
  numeric,
  unique,
} from 'drizzle-orm/pg-core';
import { pk, tenantId, timestamps, softDelete } from './_shared';
import { tenants } from './tenants';
import { users } from './core';

// Courses
export const courses = pgTable('courses', {
  id: pk(),
  tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  creator_id: uuid('creator_id')
    .notNull()
    .references(() => users.id, { onDelete: 'set null' }),
  prerequisites: jsonb('prerequisites').notNull().default([]),
  is_public: boolean('is_public').notNull().default(false),
  tags: jsonb('tags').notNull().default([]),
  ...timestamps,
  ...softDelete,
});

// Modules
export const modules = pgTable(
  'modules',
  {
    id: pk(),
    course_id: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    order_index: integer('order_index').notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (table) => ({
    course_order_unique: unique().on(table.course_id, table.order_index),
  })
);

// Media Assets
export const media_assets = pgTable('media_assets', {
  id: pk(),
  tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
  course_id: uuid('course_id').references(() => courses.id, {
    onDelete: 'cascade',
  }),
  module_id: uuid('module_id').references(() => modules.id, {
    onDelete: 'cascade',
  }),
  title: text('title').notNull(),
  media_type: text('media_type', {
    enum: ['VIDEO', 'AUDIO', 'DOCUMENT'],
  }).notNull(),
  file_url: text('file_url').notNull(),
  duration: integer('duration'),
  transcription_status: text('transcription_status', {
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
  })
    .notNull()
    .default('PENDING'),
  metadata: jsonb('metadata').notNull().default({}),
  ...timestamps,
  ...softDelete,
});

// Transcripts
export const transcripts = pgTable(
  'transcripts',
  {
    id: pk(),
    asset_id: uuid('asset_id')
      .notNull()
      .references(() => media_assets.id, { onDelete: 'cascade' }),
    language: text('language').notNull().default('en'),
    full_text: text('full_text').notNull(),
    ...timestamps,
  },
  (table) => ({
    asset_language_unique: unique().on(table.asset_id, table.language),
  })
);

// Transcript Segments
export const transcript_segments = pgTable('transcript_segments', {
  id: pk(),
  transcript_id: uuid('transcript_id')
    .notNull()
    .references(() => transcripts.id, { onDelete: 'cascade' }),
  start_time: numeric('start_time', { precision: 10, scale: 3 }).notNull(),
  end_time: numeric('end_time', { precision: 10, scale: 3 }).notNull(),
  text: text('text').notNull(),
  speaker: text('speaker'),
  ...timestamps,
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;
export type MediaAsset = typeof media_assets.$inferSelect;
export type NewMediaAsset = typeof media_assets.$inferInsert;
export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;
export type TranscriptSegment = typeof transcript_segments.$inferSelect;
export type NewTranscriptSegment = typeof transcript_segments.$inferInsert;
