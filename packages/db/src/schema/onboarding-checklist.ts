/**
 * Org Onboarding Checklist — FEAT-ORG-ONBOARDING Phase 1
 * Tracks per-tenant onboarding progress through provisioning steps.
 *
 * RLS: tenant-scoped via `tenant_id`
 * SI-1: uses app.current_tenant + app.current_user_id (NOT app.current_user)
 */
import {
  pgTable,
  uuid,
  boolean,
  jsonb,
  timestamp,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';

/** Default checklist step definitions */
export interface OnboardingStep {
  key: string;
  completed: boolean;
  completedAt?: string;
}

export const defaultChecklistSteps: OnboardingStep[] = [
  { key: 'BRANDING_CONFIGURED', completed: false },
  { key: 'FIRST_USER_INVITED', completed: false },
  { key: 'FIRST_COURSE_CREATED', completed: false },
  { key: 'DOMAIN_CONFIGURED', completed: false },
  { key: 'SSO_CONFIGURED', completed: false },
];

export const orgOnboardingChecklist = pgTable(
  'org_onboarding_checklist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id)
      .unique(),
    steps: jsonb('steps')
      .$type<OnboardingStep[]>()
      .notNull()
      .default(defaultChecklistSteps),
    allCompleted: boolean('all_completed').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  () => [
    pgPolicy('org_onboarding_checklist_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type OrgOnboardingChecklist = typeof orgOnboardingChecklist.$inferSelect;
export type NewOrgOnboardingChecklist =
  typeof orgOnboardingChecklist.$inferInsert;
