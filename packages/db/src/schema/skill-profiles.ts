/**
 * skill_profiles — stores role/goal skill profiles for the Skill Gap Analysis feature (F-006).
 * RLS: all authenticated users (within tenant) can read; instructors/admins can create.
 */
import { pgTable, uuid, text, timestamp, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const skillProfiles = pgTable(
  'skill_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roleName: text('role_name').notNull(),
    description: text('description'),
    /** Ordered list of concept names required for this role/goal */
    requiredConcepts: text('required_concepts').array().notNull().default(sql`'{}'::text[]`),
    tenantId: uuid('tenant_id').notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    pgPolicy('skill_profiles_tenant_isolation', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
      `,
      withCheck: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
        )
      `,
    }),
  ],
).enableRLS();

export type SkillProfile = typeof skillProfiles.$inferSelect;
export type NewSkillProfile = typeof skillProfiles.$inferInsert;
