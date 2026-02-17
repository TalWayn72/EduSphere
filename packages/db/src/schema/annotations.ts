import { pgTable, uuid, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { contentItems } from './contentItems';
import { users } from './users';

export const annotationTypeEnum = pgEnum('annotation_type', [
  'HIGHLIGHT',
  'NOTE',
  'QUESTION',
  'BOOKMARK',
]);

export const annotations = pgTable('annotations', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentItemId: uuid('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: annotationTypeEnum('type').notNull(),
  text: text('text'),
  highlightedText: text('highlighted_text'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  color: text('color'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const annotationsRLS = sql`
CREATE POLICY annotations_user_isolation ON annotations
  USING (user_id::text = current_setting('app.current_user', TRUE))
  WITH CHECK (user_id::text = current_setting('app.current_user', TRUE));

ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
`;

export const annotationsIndexes = sql`
CREATE INDEX idx_annotations_content ON annotations(content_item_id);
CREATE INDEX idx_annotations_user ON annotations(user_id);
CREATE INDEX idx_annotations_type ON annotations(type);
`;

export type Annotation = typeof annotations.$inferSelect;
export type NewAnnotation = typeof annotations.$inferInsert;
