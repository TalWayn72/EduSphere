import {
  pgTable,
  uuid,
  real,
  boolean,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { contentItems } from './contentItems';
import { users } from './users';

/**
 * quiz_results — stores per-user quiz submission outcomes.
 * RLS: users see only their own results; instructors see all results in their tenant.
 */
export const quizResults = pgTable('quiz_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  contentItemId: uuid('content_item_id')
    .notNull()
    .references(() => contentItems.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  score: real('score').notNull(),
  passed: boolean('passed').notNull(),
  answers: jsonb('answers').notNull(),
  itemResults: jsonb('item_results').notNull(),
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
});

/**
 * RLS: student sees own rows; instructors see all rows for their tenant.
 * The instructor check relies on the user's role stored in the JWT session var.
 */
export const quizResultsRLS = sql`
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY quiz_results_student ON quiz_results
  FOR ALL
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR current_setting('app.current_user_role', TRUE) IN ('INSTRUCTOR','ORG_ADMIN','SUPER_ADMIN')
  )
  WITH CHECK (
    user_id::text = current_setting('app.current_user_id', TRUE)
  );
`;

export const quizResultsIndexes = sql`
CREATE INDEX idx_quiz_results_user ON quiz_results(user_id);
CREATE INDEX idx_quiz_results_content ON quiz_results(content_item_id);
CREATE INDEX idx_quiz_results_tenant ON quiz_results(tenant_id);
`;

export type QuizResult = typeof quizResults.$inferSelect;
export type NewQuizResult = typeof quizResults.$inferInsert;
