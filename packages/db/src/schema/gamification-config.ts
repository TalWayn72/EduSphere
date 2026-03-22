/**
 * Gamification Config — FEAT-ORG-ONBOARDING Phase 1
 * Per-tenant gamification settings and XP rule overrides.
 *
 * RLS: tenant-scoped via `tenant_id`
 * SI-1: uses app.current_tenant (NOT app.current_user)
 */
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  timestamp,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';

/** XP rules per action type */
export interface XpRules {
  course_completion: number;
  lesson_completion: number;
  quiz_pass: number;
  discussion_post: number;
  peer_review: number;
  streak_bonus_per_day: number;
  daily_login: number;
}

export const defaultXpRules: XpRules = {
  course_completion: 100,
  lesson_completion: 10,
  quiz_pass: 25,
  discussion_post: 5,
  peer_review: 15,
  streak_bonus_per_day: 2,
  daily_login: 1,
};

export const gamificationConfig = pgTable(
  'gamification_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id)
      .unique(),
    enabled: boolean('enabled').notNull().default(true),
    showLeaderboard: boolean('show_leaderboard').notNull().default(true),
    showBadges: boolean('show_badges').notNull().default(true),
    showPoints: boolean('show_points').notNull().default(true),
    showStreaks: boolean('show_streaks').notNull().default(true),
    xpRules: jsonb('xp_rules')
      .$type<XpRules>()
      .notNull()
      .default(defaultXpRules),
    /** TENANT | DEPARTMENT | GLOBAL */
    leaderboardScope: varchar('leaderboard_scope', { length: 20 })
      .notNull()
      .default('TENANT'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  () => [
    pgPolicy('gamification_config_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type GamificationConfig = typeof gamificationConfig.$inferSelect;
export type NewGamificationConfig = typeof gamificationConfig.$inferInsert;
