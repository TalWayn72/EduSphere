import { pgTable, uuid, timestamp, customType } from 'drizzle-orm/pg-core';
import { pk } from './_shared';
import { transcript_segments } from './content';
import { annotations } from './annotation';

// Custom vector type for pgvector
const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector(768)';
  },
});

// Content Embeddings (for transcript segments)
export const content_embeddings = pgTable('content_embeddings', {
  id: pk(),
  segment_id: uuid('segment_id')
    .notNull()
    .references(() => transcript_segments.id, { onDelete: 'cascade' })
    .unique(),
  embedding: vector('embedding').notNull(),
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
  embedding: vector('embedding').notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Concept Embeddings (for knowledge graph concepts)
export const concept_embeddings = pgTable('concept_embeddings', {
  id: pk(),
  concept_id: uuid('concept_id').notNull().unique(),
  // Note: No FK to AGE graph — conceptually references ag_catalog vertex
  embedding: vector('embedding').notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ContentEmbedding = typeof content_embeddings.$inferSelect;
export type NewContentEmbedding = typeof content_embeddings.$inferInsert;
export type AnnotationEmbedding = typeof annotation_embeddings.$inferSelect;
export type NewAnnotationEmbedding = typeof annotation_embeddings.$inferInsert;
export type ConceptEmbedding = typeof concept_embeddings.$inferSelect;
export type NewConceptEmbedding = typeof concept_embeddings.$inferInsert;
