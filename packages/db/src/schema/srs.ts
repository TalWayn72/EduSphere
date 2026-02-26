/**
 * spaced_repetition_cards — stores SM-2 review scheduling state per user per concept.
 * RLS: users can only read/write their own cards; admins can read all within tenant.
 * Feature: F-001 Spaced Repetition System
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  real,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const spacedRepetitionCards = pgTable(
  'spaced_repetition_cards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    /** Human-readable label of the concept/item being reviewed */
    conceptName: text('concept_name').notNull(),
    /** Date when card is next due for review */
    dueDate: timestamp('due_date', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** SM-2: current interval in days before next review */
    intervalDays: integer('interval_days').notNull().default(1),
    /** SM-2: ease factor (min 1.3, default 2.5) */
    easeFactor: real('ease_factor').notNull().default(2.5),
    /** SM-2: number of consecutive correct repetitions */
    repetitions: integer('repetitions').notNull().default(0),
    /** Timestamp of the most recent review (null = never reviewed) */
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    pgPolicy('srs_cards_rls', {
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

export type SpacedRepetitionCard = typeof spacedRepetitionCards.$inferSelect;
export type NewSpacedRepetitionCard = typeof spacedRepetitionCards.$inferInsert;
