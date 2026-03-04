import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './core';

export const savedSearches = pgTable('saved_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  query: text('query').notNull(),
  filters: jsonb('filters'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const savedSearchesRLS = sql`
CREATE POLICY saved_searches_user_isolation ON saved_searches
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    AND tenant_id::text = current_setting('app.current_tenant', TRUE)
  )
  WITH CHECK (
    user_id::text = current_setting('app.current_user_id', TRUE)
    AND tenant_id::text = current_setting('app.current_tenant', TRUE)
  );

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
`;

export const savedSearchesIndexes = sql`
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_tenant ON saved_searches(tenant_id);
`;

export type SavedSearch = typeof savedSearches.$inferSelect;
export type NewSavedSearch = typeof savedSearches.$inferInsert;
