import {
  pgTable,
  uuid,
  timestamp,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { contentItems } from './contentItems';

export const userProgress = pgTable('user_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  contentItemId: uuid('content_item_id')
    .notNull()
    .references(() => contentItems.id, { onDelete: 'cascade' }),
  isCompleted: boolean('is_completed').notNull().default(false),
  progress: integer('progress').notNull().default(0),
  timeSpent: integer('time_spent').notNull().default(0),
  lastAccessedAt: timestamp('last_accessed_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const userProgressRLS = sql`
CREATE POLICY user_progress_isolation ON user_progress
  USING (user_id::text = current_setting('app.current_user', TRUE))
  WITH CHECK (user_id::text = current_setting('app.current_user', TRUE));

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
`;

export const userProgressIndexes = sql`
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_content ON user_progress(content_item_id);
CREATE UNIQUE INDEX idx_user_progress_unique ON user_progress(user_id, content_item_id);
`;

export type UserProgress = typeof userProgress.$inferSelect;
export type NewUserProgress = typeof userProgress.$inferInsert;
