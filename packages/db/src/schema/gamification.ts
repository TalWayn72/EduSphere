/**
 * Gamification tables — badges, user_badges, user_points, point_events (F-011)
 * RLS: tenant-scoped; users see own data; admins see all in tenant.
 */
import {
  pgTable, uuid, text, timestamp, integer, jsonb, pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Badge definitions (platform-wide: tenant_id nullable) ─────────────────────
export const badges = pgTable('badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  iconEmoji: text('icon_emoji').notNull(),
  category: text('category').notNull(), // STREAK | COMPLETION | ENGAGEMENT | SOCIAL
  pointsReward: integer('points_reward').notNull().default(0),
  conditionType: text('condition_type').notNull(),
  conditionValue: integer('condition_value').notNull(),
  tenantId: uuid('tenant_id'), // null = platform-wide
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Badge = typeof badges.$inferSelect;
export type NewBadge = typeof badges.$inferInsert;

// ── Earned badge instances ────────────────────────────────────────────────────
export const userBadges = pgTable(
  'user_badges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    badgeId: uuid('badge_id').notNull().references(() => badges.id),
    tenantId: uuid('tenant_id').notNull(),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
    context: jsonb('context'),
  },
  (table) => [
    pgPolicy('user_badges_rls', {
      using: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ],
).enableRLS();

export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;

// ── Running point totals per user ────────────────────────────────────────────
export const userPoints = pgTable(
  'user_points',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().unique(),
    tenantId: uuid('tenant_id').notNull(),
    totalPoints: integer('total_points').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    pgPolicy('user_points_rls', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ],
).enableRLS();

export type UserPoints = typeof userPoints.$inferSelect;
export type NewUserPoints = typeof userPoints.$inferInsert;

// ── Individual point award events ────────────────────────────────────────────
export const pointEvents = pgTable(
  'point_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    eventType: text('event_type').notNull(),
    points: integer('points').notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    pgPolicy('point_events_rls', {
      using: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ],
).enableRLS();

export type PointEvent = typeof pointEvents.$inferSelect;
export type NewPointEvent = typeof pointEvents.$inferInsert;
