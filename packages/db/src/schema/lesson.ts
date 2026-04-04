import {
  pgTable,
  text,
  uuid,
  jsonb,
  numeric,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { pk, tenantId, timestamps, softDelete } from './_shared';
import { tenants } from './tenants';
import { users } from './core';
import { courses } from './content';
import { modules } from './content';
import { media_assets } from './content';
import { knowledgeSources } from './knowledge-sources';

// ─── Lessons ──────────────────────────────────────────────────────────────────

export const lessons = pgTable('lessons', {
  id: pk(),
  tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
  course_id: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  module_id: uuid('module_id').references(() => modules.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  type: text('type', {
    enum: ['THEMATIC', 'SEQUENTIAL'],
  })
    .notNull()
    .default('THEMATIC'),
  series: text('series'),
  lesson_date: timestamp('lesson_date', { withTimezone: true }),
  instructor_id: uuid('instructor_id')
    .notNull()
    .references(() => users.id),
  status: text('status', {
    enum: ['DRAFT', 'PROCESSING', 'READY', 'PUBLISHED'],
  })
    .notNull()
    .default('DRAFT'),
  published_run_id: uuid('published_run_id'),
  ...timestamps,
  ...softDelete,
});

// ─── Lesson Assets ────────────────────────────────────────────────────────────

export const lesson_assets = pgTable('lesson_assets', {
  id: pk(),
  lesson_id: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  asset_type: text('asset_type', {
    enum: ['VIDEO', 'AUDIO', 'NOTES', 'WHITEBOARD'],
  }).notNull(),
  source_url: text('source_url'),
  file_url: text('file_url'),
  media_asset_id: uuid('media_asset_id').references(() => media_assets.id, {
    onDelete: 'set null',
  }),
  metadata: jsonb('metadata').notNull().default({}),
  ...timestamps,
});

// ─── Lesson Pipelines ─────────────────────────────────────────────────────────

export const lesson_pipelines = pgTable('lesson_pipelines', {
  id: pk(),
  lesson_id: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  template_name: text('template_name'),
  nodes: jsonb('nodes').notNull().default([]),
  config: jsonb('config').notNull().default({}),
  status: text('status', {
    enum: ['DRAFT', 'READY', 'RUNNING', 'COMPLETED', 'FAILED'],
  })
    .notNull()
    .default('DRAFT'),
  ...timestamps,
});

// ─── Lesson Pipeline Runs ─────────────────────────────────────────────────────

export const lesson_pipeline_runs = pgTable('lesson_pipeline_runs', {
  id: pk(),
  pipeline_id: uuid('pipeline_id')
    .notNull()
    .references(() => lesson_pipelines.id, { onDelete: 'cascade' }),
  lesson_id: uuid('lesson_id').references(() => lessons.id, {
    onDelete: 'cascade',
  }),
  run_number: integer('run_number').notNull().default(1),
  triggered_by: text('triggered_by').default('MANUAL'),
  started_at: timestamp('started_at', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  status: text('status', {
    enum: ['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  })
    .notNull()
    .default('RUNNING'),
  logs: jsonb('logs').notNull().default([]),
  ...timestamps,
});

// ─── Lesson Pipeline Results ──────────────────────────────────────────────────

export const lesson_pipeline_results = pgTable('lesson_pipeline_results', {
  id: pk(),
  run_id: uuid('run_id')
    .notNull()
    .references(() => lesson_pipeline_runs.id, { onDelete: 'cascade' }),
  module_name: text('module_name').notNull(),
  output_type: text('output_type').notNull(),
  output_data: jsonb('output_data').notNull().default({}),
  file_url: text('file_url'),
  ...timestamps,
});

// ─── Lesson Citations ─────────────────────────────────────────────────────────

export const lesson_citations = pgTable('lesson_citations', {
  id: pk(),
  lesson_id: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  source_text: text('source_text').notNull(),
  book_name: text('book_name').notNull(),
  part: text('part'),
  page: text('page'),
  column: text('column'),
  paragraph: text('paragraph'),
  match_status: text('match_status', {
    enum: ['VERIFIED', 'UNVERIFIED', 'FAILED'],
  })
    .notNull()
    .default('UNVERIFIED'),
  confidence: numeric('confidence', { precision: 5, scale: 4 }),
  /** FK to knowledge_sources — resolved source document (FEAT: Semantic-Enriched Lesson). */
  knowledge_source_id: uuid('knowledge_source_id').references(
    () => knowledgeSources.id,
    { onDelete: 'set null' }
  ),
  /** Actual resolved source text fetched from knowledge graph. */
  resolved_text: text('resolved_text'),
  /** Apache AGE graph node ID for the Source vertex. */
  graph_source_id: text('graph_source_id'),
  ...timestamps,
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type LessonAsset = typeof lesson_assets.$inferSelect;
export type NewLessonAsset = typeof lesson_assets.$inferInsert;
export type LessonPipeline = typeof lesson_pipelines.$inferSelect;
export type NewLessonPipeline = typeof lesson_pipelines.$inferInsert;
export type LessonPipelineRun = typeof lesson_pipeline_runs.$inferSelect;
export type NewLessonPipelineRun = typeof lesson_pipeline_runs.$inferInsert;
export type LessonPipelineResult = typeof lesson_pipeline_results.$inferSelect;
export type NewLessonPipelineResult =
  typeof lesson_pipeline_results.$inferInsert;
export type LessonCitation = typeof lesson_citations.$inferSelect;
export type NewLessonCitation = typeof lesson_citations.$inferInsert;
