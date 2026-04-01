/**
 * Exam Sessions + Responses — Certification Exam System
 *
 * Tables:
 *   exam_sessions   — active exam delivery (scheduling, timing, proctoring)
 *   exam_responses   — per-question answer records within a session
 *
 * RLS: students see own sessions/responses; instructors/admins see all in tenant.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  pgEnum,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../core';
import { examBlueprints } from './exam-blueprints';
import { examItems } from './exam-items';

// ── Enums ──────────────────────────────────────────────────────────────────

export const examSessionStatusEnum = pgEnum('exam_session_status', [
  'SCHEDULED',
  'IN_PROGRESS',
  'SUBMITTED',
  'GRADED',
  'TIMED_OUT',
  'VOIDED',
]);

// ── exam_sessions ──────────────────────────────────────────────────────────

export const examSessions = pgTable(
  'exam_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    blueprintId: uuid('blueprint_id')
      .notNull()
      .references(() => examBlueprints.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: examSessionStatusEnum('status').notNull().default('SCHEDULED'),
    attemptNumber: integer('attempt_number').notNull().default(1),
    startedAt: timestamp('started_at', { withTimezone: true }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    timeRemainingSeconds: integer('time_remaining_seconds'),
    questionOrder: jsonb('question_order'),
    optionShuffleSeeds: jsonb('option_shuffle_seeds'),
    isAdaptive: boolean('is_adaptive').notNull().default(false),
    catState: jsonb('cat_state'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    browserEvents: jsonb('browser_events').notNull().default([]),
    proctoringSessionId: uuid('proctoring_session_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_exam_sessions_tenant').on(t.tenantId),
    index('idx_exam_sessions_user').on(t.userId),
    index('idx_exam_sessions_blueprint').on(t.blueprintId),
    index('idx_exam_sessions_status').on(t.status),
    pgPolicy('exam_sessions_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          user_id::text = current_setting('app.current_user_id', TRUE)
          OR current_setting('app.current_user_role', TRUE)
              IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
        )
      `,
      withCheck: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND user_id::text = current_setting('app.current_user_id', TRUE)
      `,
    }),
  ]
).enableRLS();

// ── exam_responses ─────────────────────────────────────────────────────────

export const examResponses = pgTable(
  'exam_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => examSessions.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => examItems.id, { onDelete: 'cascade' }),
    answerData: jsonb('answer_data'),
    isCorrect: boolean('is_correct'),
    isFlagged: boolean('is_flagged').notNull().default(false),
    timeSpentMs: integer('time_spent_ms'),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_exam_responses_session').on(t.sessionId),
    index('idx_exam_responses_item').on(t.itemId),
  ]
);

export type ExamSession = typeof examSessions.$inferSelect;
export type NewExamSession = typeof examSessions.$inferInsert;
export type ExamResponse = typeof examResponses.$inferSelect;
export type NewExamResponse = typeof examResponses.$inferInsert;
