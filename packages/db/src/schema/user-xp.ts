/**
 * XP/Gamification tables — user_xp_events, user_xp_totals (Phase 36)
 * RLS: users see own data; admins see all in tenant.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  jsonb,
  timestamp,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId } from './_shared';

export const xpEventTypeEnum = pgEnum('xp_event_type', [
  'LESSON_COMPLETED',
  'QUIZ_PASSED',
  'STREAK_BONUS',
  'COURSE_COMPLETED',
]);

// ── Individual XP award events ────────────────────────────────────────────────
export const userXpEvents = pgTable(
  'user_xp_events',
  {
    id: pk(),
    userId: uuid('user_id').notNull(),
    tenantId: tenantId(),
    eventType: xpEventTypeEnum('event_type').notNull(),
    xpAwarded: integer('xp_awarded').notNull().default(0),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    pgPolicy('xp_events_user_isolation', {
      using: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
    index('idx_xp_events_user').on(t.userId),
    index('idx_xp_events_tenant').on(t.tenantId),
  ]
).enableRLS();

export type UserXpEvent = typeof userXpEvents.$inferSelect;
export type NewUserXpEvent = typeof userXpEvents.$inferInsert;

// ── Running XP totals per user ────────────────────────────────────────────────
export const userXpTotals = pgTable(
  'user_xp_totals',
  {
    userId: uuid('user_id').primaryKey(),
    tenantId: tenantId(),
    totalXp: integer('total_xp').notNull().default(0),
    level: integer('level').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    pgPolicy('xp_totals_user_isolation', {
      using: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
    index('idx_xp_totals_tenant').on(t.tenantId),
  ]
).enableRLS();

export type UserXpTotal = typeof userXpTotals.$inferSelect;
export type NewUserXpTotal = typeof userXpTotals.$inferInsert;
