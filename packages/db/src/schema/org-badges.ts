/**
 * Org Badges — Per-org customizable badges with auto-award criteria (F-12).
 *
 * RLS: tenant-scoped via `tenant_id`
 * SI-1: uses app.current_tenant (NOT app.current_user)
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgPolicy,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';

/** Auto-award criteria types */
export type AutoAwardCriteriaType =
  | 'COURSE_COMPLETE'
  | 'XP_THRESHOLD'
  | 'STREAK_DAYS'
  | 'QUIZ_SCORE';

export interface AutoAwardCriteria {
  type: AutoAwardCriteriaType;
  courseId?: string;
  amount?: number;
  count?: number;
  minScore?: number;
}

export const orgBadges = pgTable(
  'org_badges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    iconUrl: text('icon_url'),
    xpRequired: integer('xp_required').notNull().default(0),
    autoAwardCriteria: jsonb('auto_award_criteria').$type<AutoAwardCriteria>(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    pgPolicy('org_badges_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
    index('idx_org_badges_tenant').on(t.tenantId),
    index('idx_org_badges_active').on(t.tenantId, t.isActive),
  ]
).enableRLS();

export type OrgBadge = typeof orgBadges.$inferSelect;
export type NewOrgBadge = typeof orgBadges.$inferInsert;
