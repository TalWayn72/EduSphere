import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const tagsRLS = sql`
CREATE POLICY tags_tenant_isolation ON tags
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
`;

export const tagsIndexes = sql`
CREATE INDEX idx_tags_tenant ON tags(tenant_id);
CREATE UNIQUE INDEX idx_tags_tenant_slug ON tags(tenant_id, slug);
`;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
