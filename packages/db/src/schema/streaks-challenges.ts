/**
 * Streaks + Challenges schema (Phase 37 Gamification)
 * RLS: users see own streak/progress; admins see all in tenant.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  index,
  pgPolicy,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId } from './_shared';

// ── Challenge target type enum ────────────────────────────────────────────────
export const challengeTargetTypeEnum = pgEnum('challenge_target_type', [
  'LESSON_COUNT',
  'XP_EARNED',
  'QUIZ_COUNT',
  'DISCUSSION_COUNT',
]);

// ── User streaks table ────────────────────────────────────────────────────────
export const userStreaks = pgTable(
  'user_streaks',
  {
    id: pk(),
    userId: uuid('user_id').notNull(),
    tenantId: tenantId(),
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    lastActivityDate: date('last_activity_date'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    pgPolicy('user_streaks_isolation', {
      using: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      `,
    }),
    uniqueIndex('idx_user_streaks_user_tenant').on(t.userId, t.tenantId),
    index('idx_user_streaks_tenant').on(t.tenantId),
  ]
).enableRLS();

export type UserStreak = typeof userStreaks.$inferSelect;
export type NewUserStreak = typeof userStreaks.$inferInsert;

// ── Challenges table ──────────────────────────────────────────────────────────
export const challenges = pgTable(
  'challenges',
  {
    id: pk(),
    tenantId: tenantId(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    targetType: challengeTargetTypeEnum('target_type').notNull(),
    targetValue: integer('target_value').notNull(),
    xpReward: integer('xp_reward').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    pgPolicy('challenges_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
    index('idx_challenges_tenant_active').on(t.tenantId, t.isActive, t.endDate),
  ]
).enableRLS();

export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;

// ── User challenge progress table ─────────────────────────────────────────────
export const userChallengeProgress = pgTable(
  'user_challenge_progress',
  {
    id: pk(),
    userId: uuid('user_id').notNull(),
    tenantId: tenantId(),
    challengeId: uuid('challenge_id').notNull(),
    currentValue: integer('current_value').notNull().default(0),
    completed: boolean('completed').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    pgPolicy('user_challenge_progress_isolation', {
      using: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      `,
    }),
    uniqueIndex('idx_ucp_user_challenge').on(t.userId, t.challengeId),
    index('idx_ucp_tenant_user').on(t.tenantId, t.userId),
  ]
).enableRLS();

export type UserChallengeProgress = typeof userChallengeProgress.$inferSelect;
export type NewUserChallengeProgress = typeof userChallengeProgress.$inferInsert;
