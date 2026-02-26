import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { modules } from './modules';

export const contentTypeEnum = pgEnum('content_type', [
  'VIDEO',
  'PDF',
  'MARKDOWN',
  'QUIZ',
  'ASSIGNMENT',
  'LINK',
  'AUDIO',
  'LIVE_SESSION',
  'SCORM',
  'RICH_DOCUMENT',
  'MICROLESSON',
  'SCENARIO',
]);

export const contentItems = pgTable('content_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id')
    .notNull()
    .references(() => modules.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  type: contentTypeEnum('type').notNull(),
  content: text('content'),
  fileId: uuid('file_id'),
  duration: integer('duration'),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const contentItemsRLS = sql`
CREATE POLICY content_items_tenant_isolation ON content_items
  USING (
    EXISTS (
      SELECT 1 FROM modules
      JOIN courses ON courses.id = modules.course_id
      WHERE modules.id = content_items.module_id
      AND courses.tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
`;

export const contentItemsIndexes = sql`
CREATE INDEX idx_content_items_module ON content_items(module_id);
CREATE INDEX idx_content_items_type ON content_items(type);
CREATE INDEX idx_content_items_file ON content_items(file_id);
`;

export type ContentItem = typeof contentItems.$inferSelect;
export type NewContentItem = typeof contentItems.$inferInsert;
