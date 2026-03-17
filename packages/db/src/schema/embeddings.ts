import { pgTable, uuid, timestamp, vector } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk } from './_shared';
import { transcript_segments } from './content';
import { annotations } from './annotation';

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
  WITH (m = 16, ef_construction = 64);
`;

export const annotationEmbeddingsHnswIdx = sql`
CREATE INDEX IF NOT EXISTS idx_annotation_embeddings_hnsw
  ON annotation_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
`;

export const conceptEmbeddingsHnswIdx = sql`
CREATE INDEX IF NOT EXISTS idx_concept_embeddings_hnsw
  ON concept_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
`;

export type ContentEmbedding = typeof content_embeddings.$inferSelect;
export type NewContentEmbedding = typeof content_embeddings.$inferInsert;
export type AnnotationEmbedding = typeof annotation_embeddings.$inferSelect;
export type NewAnnotationEmbedding = typeof annotation_embeddings.$inferInsert;
export type ConceptEmbedding = typeof concept_embeddings.$inferSelect;
export type NewConceptEmbedding = typeof concept_embeddings.$inferInsert;
