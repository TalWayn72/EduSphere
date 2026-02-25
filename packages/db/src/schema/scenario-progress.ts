/**
 * Scenario Progress schema — F-009 Branching Scenario-Based Learning
 *
 * scenario_choices: records each choice a learner makes while traversing
 * a branching SCENARIO content item graph.
 *
 * RLS:
 *   - Users see only their own choices
 *   - Instructors see all choices within their tenant
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId } from './_shared';
import { users } from './core';

export const scenario_choices = pgTable('scenario_choices', {
  id: pk(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenant_id: tenantId(),
  /** The content item from which the learner made a choice */
  from_content_item_id: uuid('from_content_item_id').notNull(),
  /** The id of the choice selected (matches ScenarioContent.choices[].id) */
  choice_id: text('choice_id').notNull(),
  /** Destination content item (null = end of branch) */
  to_content_item_id: uuid('to_content_item_id'),
  /** The root/first node of this scenario tree, used to track full progress */
  scenario_root_id: uuid('scenario_root_id').notNull(),
  chosen_at: timestamp('chosen_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scenarioChoicesRLS = sql`
CREATE POLICY scenario_choices_user_isolation ON scenario_choices
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR EXISTS (
      SELECT 1
      FROM tenants t
      WHERE t.id::text = tenant_id::text
        AND tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_role', TRUE) IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    user_id::text = current_setting('app.current_user_id', TRUE)
  );

ALTER TABLE scenario_choices ENABLE ROW LEVEL SECURITY;
`;

export const scenarioChoicesIndexes = sql`
CREATE INDEX idx_scenario_choices_user ON scenario_choices(user_id);
CREATE INDEX idx_scenario_choices_tenant ON scenario_choices(tenant_id);
CREATE INDEX idx_scenario_choices_root ON scenario_choices(scenario_root_id);
CREATE INDEX idx_scenario_choices_from ON scenario_choices(from_content_item_id);
`;

export type ScenarioChoice = typeof scenario_choices.$inferSelect;
export type NewScenarioChoice = typeof scenario_choices.$inferInsert;
