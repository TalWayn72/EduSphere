import { pgTable, uuid, text, timestamp, jsonb, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { contentItems } from './contentItems';

const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector(768)';
  },
});

export const embeddings = pgTable('embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentItemId: uuid('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }),
  chunkText: text('chunk_text').notNull(),
  embedding: vector('embedding').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const embeddingsRLS = sql`
CREATE POLICY embeddings_tenant_isolation ON embeddings
  USING (
    EXISTS (
      SELECT 1 FROM content_items
      JOIN modules ON modules.id = content_items.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE content_items.id = embeddings.content_item_id
      AND courses.tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );

ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
`;

export const embeddingsIndexes = sql`
CREATE INDEX idx_embeddings_content ON embeddings(content_item_id);
CREATE INDEX idx_embeddings_vector ON embeddings USING hnsw (embedding vector_cosine_ops);
`;

export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
