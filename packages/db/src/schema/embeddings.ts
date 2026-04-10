import {
  pgTable,
  uuid,
  timestamp,
  integer,
  text,
  vector,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk } from './_shared';
import { transcript_segments } from './content';
import { annotations } from './annotation';
import { knowledgeSources } from './knowledge-sources';

// Drizzle ORM v0.45 native pgvector support — replaces customType pattern
// Dimensions: 768 (nomic-embed-text dev / text-embedding-3-small prod)

// Content Embeddings (for transcript segments)
// RLS: tenant isolation via parent transcript_segments.tenant_id join
export const content_embeddings = pgTable(
  'content_embeddings',
  {
    id: pk(),
    segment_id: uuid('segment_id')
      .notNull()
      .references(() => transcript_segments.id, { onDelete: 'cascade' })
      .unique(),
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_content_embeddings_segment').on(t.segment_id),
    pgPolicy('content_embeddings_rls', {
      using: sql`
        EXISTS (
          SELECT 1 FROM transcript_segments ts
          JOIN media_assets ma ON ma.id = ts.media_asset_id
          JOIN courses c ON c.id = ma.course_id
          WHERE ts.id = ${t.segment_id}
            AND c.tenant_id::text = current_setting('app.current_tenant', TRUE)
        )
      `,
    }),
  ]
).enableRLS();

// Annotation Embeddings
// RLS: tenant isolation via parent annotations.tenant_id join
export const annotation_embeddings = pgTable(
  'annotation_embeddings',
  {
    id: pk(),
    annotation_id: uuid('annotation_id')
      .notNull()
      .references(() => annotations.id, { onDelete: 'cascade' })
      .unique(),
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_annotation_embeddings_annotation').on(t.annotation_id),
    pgPolicy('annotation_embeddings_rls', {
      using: sql`
        EXISTS (
          SELECT 1 FROM annotations a
          WHERE a.id = ${t.annotation_id}
            AND a.tenant_id::text = current_setting('app.current_tenant', TRUE)
        )
      `,
    }),
  ]
).enableRLS();

// Concept Embeddings (for knowledge graph concepts)
// RLS: tenant isolation via concept_id — conceptually references ag_catalog vertex
// Access restricted to instructors+ since concepts are shared knowledge assets
export const concept_embeddings = pgTable(
  'concept_embeddings',
  {
    id: pk(),
    concept_id: uuid('concept_id').notNull().unique(),
    // Note: No FK to AGE graph — conceptually references ag_catalog vertex
    tenant_id: uuid('tenant_id').notNull(),
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_concept_embeddings_concept').on(t.concept_id),
    index('idx_concept_embeddings_tenant').on(t.tenant_id),
    pgPolicy('concept_embeddings_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
      `,
      withCheck: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
      `,
    }),
  ]
).enableRLS();

// HNSW indexes for cosine similarity search (applied via migration)
export const contentEmbeddingsHnswIdx = sql`
CREATE INDEX IF NOT EXISTS idx_content_embeddings_hnsw
  ON content_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 128);
`;

export const annotationEmbeddingsHnswIdx = sql`
CREATE INDEX IF NOT EXISTS idx_annotation_embeddings_hnsw
  ON annotation_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 128);
`;

export const conceptEmbeddingsHnswIdx = sql`
CREATE INDEX IF NOT EXISTS idx_concept_embeddings_hnsw
  ON concept_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 128);
`;

export type ContentEmbedding = typeof content_embeddings.$inferSelect;
export type NewContentEmbedding = typeof content_embeddings.$inferInsert;
export type AnnotationEmbedding = typeof annotation_embeddings.$inferSelect;
export type NewAnnotationEmbedding = typeof annotation_embeddings.$inferInsert;
export type ConceptEmbedding = typeof concept_embeddings.$inferSelect;
export type NewConceptEmbedding = typeof concept_embeddings.$inferInsert;

/**
 * Knowledge Source Chunk Embeddings — one row per text chunk from a knowledge
 * source. Uses a (source_id, chunk_index) unique constraint instead of a UUID
 * segment_id FK so knowledge source chunks are decoupled from transcript_segments.
 *
 * RLS: row access governed by the parent knowledge_sources.tenant_id.
 */
export const knowledge_source_chunk_embeddings = pgTable(
  'knowledge_source_chunk_embeddings',
  {
    id: pk(),
    source_id: uuid('source_id')
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: 'cascade' }),
    chunk_index: integer('chunk_index').notNull(),
    chunk_text: text('chunk_text').notNull().default(''),
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_ks_chunk_embeddings_source').on(t.source_id),
    pgPolicy('ks_chunk_embeddings_rls', {
      using: sql`
        EXISTS (
          SELECT 1 FROM knowledge_sources ks
          WHERE ks.id = ${t.source_id}
            AND ks.tenant_id::text = current_setting('app.current_tenant', TRUE)
        )
      `,
    }),
  ]
).enableRLS();

export const ksChunkEmbeddingsHnswIdx = sql`
CREATE INDEX IF NOT EXISTS idx_ks_chunk_embeddings_hnsw
  ON knowledge_source_chunk_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 128);
`;

export type KsChunkEmbedding =
  typeof knowledge_source_chunk_embeddings.$inferSelect;
export type NewKsChunkEmbedding =
  typeof knowledge_source_chunk_embeddings.$inferInsert;

// exam_item_embeddings lives in schema/exam/exam-items.ts (already has enableRLS)
// Re-exported from exam/index.ts — no changes needed here
