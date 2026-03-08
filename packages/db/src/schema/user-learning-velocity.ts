import {
  pgTable,
  uuid,
  integer,
  timestamp,
  date,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const userLearningVelocity = pgTable('user_learning_velocity', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  weekStart: date('week_start').notNull(),
  lessonsCompleted: integer('lessons_completed').notNull().default(0),
  minutesStudied: integer('minutes_studied').notNull().default(0),
  annotationsAdded: integer('annotations_added').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userLearningVelocityRLS = sql`
ALTER TABLE user_learning_velocity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_learning_velocity_isolation" ON user_learning_velocity
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR tenant_id::text = current_setting('app.current_tenant', TRUE)
  );
`;

export const userLearningVelocityIndexes = sql`
CREATE UNIQUE INDEX IF NOT EXISTS idx_velocity_user_week
  ON user_learning_velocity(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_velocity_tenant_week
  ON user_learning_velocity(tenant_id, week_start);
`;

export type UserLearningVelocity = typeof userLearningVelocity.$inferSelect;
export type NewUserLearningVelocity = typeof userLearningVelocity.$inferInsert;
