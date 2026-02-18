import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { contentItems } from './contentItems';
import { users } from './users';

export const discussions: any = pgTable('discussions', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentItemId: uuid('content_item_id').references(() => contentItems.id, {
    onDelete: 'cascade',
  }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  upvotes: integer('upvotes').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const discussionsRLS = sql`
CREATE POLICY discussions_tenant_isolation ON discussions
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = discussions.author_id
      AND users.tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );

ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
`;

export const discussionsIndexes = sql`
CREATE INDEX idx_discussions_content ON discussions(content_item_id);
CREATE INDEX idx_discussions_author ON discussions(author_id);
CREATE INDEX idx_discussions_parent ON discussions(parent_id);
`;

export type Discussion = typeof discussions.$inferSelect;
export type NewDiscussion = typeof discussions.$inferInsert;
