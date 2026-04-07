import { pgTable, uuid, timestamp, integer, vector } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk } from './_shared';
import { transcript_segments } from './content';
import { annotations } from './annotation';
import { knowledgeSources } from './knowledge-sources';

// Drizzle ORM v0.45 native pgvector support — replaces customType pattern
// Dimensions: 768 (nomic-embed-text dev / text-embedding-3-small prod)

// Content Embeddings (for transcript segments)
export const content_embeddings = pgTable('content_embeddings', {
  id: pk(),
  segment_id: uuid('segment_id')
    .notNull()
    .references(() => transcript_segments.id, { onDelete: 'cascade' })
    .unique(),
  embedding: vector('embedding', { dimensions: 768 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Annotation Embeddings
export const annotation_embeddings = pgTable('annotation_embeddings', {
  id: pk(),
  annotation_id: uuid('annotation_id')
    .notNull()
    .references(() => annotations.id, { onDelete: 'cascade' })
    .unique(),
  embedding: vector('embedding', { dimensions: 768 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Concept Embeddings (for knowledge graph concepts)
export const concept_embeddings = pgTable('concept_embeddings', {
  id: pk(),
  concept_id: uuid('concept_id').notNull().unique(),
  // Note: No FK to AGE graph — conceptually references ag_catalog vertex
  embedding: vector('embedding', { dimensions: 768 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

export const ksChunkEmbeddingsHnswIdx = sql`
CREATE INDEX IF NOT EXISTS idx_ks_chunk_embeddings_hnsw
  ON knowledge_source_chunk_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 128);
`;

export type KsChunkEmbedding =
  typeof knowledge_source_chunk_embeddings.$inferSelect;
export type NewKsChunkEmbedding =
  typeof knowledge_source_chunk_embeddings.$inferInsert;
