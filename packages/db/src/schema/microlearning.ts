import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

/**
 * Microlearning paths (F-021): ordered sequences of MICROLESSON content items.
 * Each path belongs to a tenant and optionally maps to a topic cluster (Knowledge graph).
 * The ordered sequence is stored as a UUID array on the application side; the DB
 * stores it as a text column containing a JSON array to stay within Drizzle v1 API.
 */
export const microlearningPaths = pgTable('microlearning_paths', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  /** JSON array of content_item UUIDs in display/playback order */
  contentItemIds: varchar('content_item_ids', { length: 8192 })
    .notNull()
    .default('[]'),
  topicClusterId: uuid('topic_cluster_id'),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const microlearningPathsRLS = sql`
CREATE POLICY microlearning_paths_tenant_isolation ON microlearning_paths
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE microlearning_paths ENABLE ROW LEVEL SECURITY;
`;

export const microlearningPathsIndexes = sql`
CREATE INDEX idx_microlearning_paths_tenant ON microlearning_paths(tenant_id);
CREATE INDEX idx_microlearning_paths_cluster ON microlearning_paths(topic_cluster_id)
  WHERE topic_cluster_id IS NOT NULL;
CREATE INDEX idx_microlearning_paths_creator ON microlearning_paths(created_by);
`;

export type MicrolearningPath = typeof microlearningPaths.$inferSelect;
export type NewMicrolearningPath = typeof microlearningPaths.$inferInsert;
