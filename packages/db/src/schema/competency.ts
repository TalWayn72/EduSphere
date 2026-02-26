/**
 * user_competency_goals — stores learner skill goals for the Auto-Pathing feature (F-002).
 * RLS: users can only read/write their own goals; admins can read all within tenant.
 */
import { pgTable, uuid, text, timestamp, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const userCompetencyGoals = pgTable(
  'user_competency_goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    targetConceptName: text('target_concept_name').notNull(),
    currentLevel: text('current_level'),
    targetLevel: text('target_level'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    pgPolicy('competency_goals_rls', {
      using: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      `,
      withCheck: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
      `,
    }),
  ]
).enableRLS();

export type UserCompetencyGoal = typeof userCompetencyGoals.$inferSelect;
export type NewUserCompetencyGoal = typeof userCompetencyGoals.$inferInsert;
