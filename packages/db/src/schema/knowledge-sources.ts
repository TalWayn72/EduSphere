import {
  pgTable,
  text,
  uuid,
  integer,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { pk, tenantId, timestamps } from './_shared';
import { tenants } from './tenants';
import { courses } from './content';

/** Source types — mirrors NotebookLM's ingestion capabilities */
export const SOURCE_TYPES = [
  'FILE_DOCX',
  'FILE_PDF',
  'FILE_TXT',
  'URL',
  'YOUTUBE',
  'TEXT',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_STATUSES = ['PENDING', 'PROCESSING', 'READY', 'FAILED'] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

/**
 * knowledge_sources — user-attached information sources for a course.
 * Conceptually the same as "notebooks" in NotebookLM: local files, URLs,
 * YouTube transcripts, or pasted text.
 */
export const knowledgeSources = pgTable('knowledge_sources', {
  id: pk(),
  tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
  course_id: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }),

  /** Display name shown in the sources panel */
  title: text('title').notNull(),

  /** Where the content came from */
  source_type: text('source_type', { enum: SOURCE_TYPES }).notNull(),

  /**
   * Original URL (for URL / YOUTUBE types) or original filename (for FILE_*).
   * Used for display and re-fetching.
   */
  origin: text('origin'),

  /** MinIO object key where the original file is stored */
  file_key: text('file_key'),

  /**
   * Full extracted plaintext — stored here so the UI can display a preview
   * and the RAG pipeline can chunk it on demand.
   */
  raw_content: text('raw_content'),

  /** Processing state */
  status: text('status', { enum: SOURCE_STATUSES }).notNull().default('PENDING'),

  /** Number of embedding chunks generated */
  chunk_count: integer('chunk_count').notNull().default(0),

  /** Error detail if status = FAILED */
  error_message: text('error_message'),

  /** Arbitrary metadata: page count, word count, language, etc. */
  metadata: jsonb('metadata').notNull().default({}),

  ...timestamps,
});

export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type NewKnowledgeSource = typeof knowledgeSources.$inferInsert;
