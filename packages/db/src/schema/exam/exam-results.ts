/**
 * Exam Results + Item Response Log — Certification Exam System
 *
 * Tables:
 *   exam_results       — scored outcomes per session (theta, SEM, domain scores)
 *   item_response_log  — append-only psychometric data for IRT calibration
 *
 * RLS: students see own results; instructors/admins see all in tenant.
 * Item response log: restricted to instructors/admins for psychometric analysis.
 */
import {
  pgTable,
  uuid,
  real,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../core';
import { examBlueprints } from './exam-blueprints';
import { examSessions } from './exam-sessions';
import { examItems } from './exam-items';

// ── exam_results ───────────────────────────────────────────────────────────

export const examResults = pgTable(
  'exam_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    sessionId: uuid('session_id')
      .notNull()
      .unique()
      .references(() => examSessions.id, { onDelete: 'cascade' }),
    blueprintId: uuid('blueprint_id')
      .notNull()
      .references(() => examBlueprints.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rawScore: real('raw_score').notNull(),
    scaledScore: integer('scaled_score'),
    passed: boolean('passed').notNull(),
    thetaEstimate: real('theta_estimate'),
    sem: real('sem'),
    confidenceInterval: jsonb('confidence_interval'),
    domainScores: jsonb('domain_scores'),
    bloomScores: jsonb('bloom_scores'),
    itemAnalysis: jsonb('item_analysis'),
    certificateId: uuid('certificate_id'),
    gradedAt: timestamp('graded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_exam_results_tenant').on(t.tenantId),
    index('idx_exam_results_user').on(t.userId),
    index('idx_exam_results_blueprint').on(t.blueprintId),
    index('idx_exam_results_passed').on(t.passed),
    pgPolicy('exam_results_rls', {
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
        AND current_setting('app.current_user_role', TRUE)
            IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
      `,
    }),
  ]
).enableRLS();

// ── item_response_log (append-only psychometric data) ──────────────────────

export const itemResponseLog = pgTable(
  'item_response_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => examItems.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    isCorrect: boolean('is_correct').notNull(),
    selectedOptionIndex: integer('selected_option_index'),
    responseTimeMs: integer('response_time_ms'),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_item_response_log_tenant').on(t.tenantId),
    index('idx_item_response_log_item').on(t.itemId),
    index('idx_item_response_log_user').on(t.userId),
    pgPolicy('item_response_log_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE)
            IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
      `,
      withCheck: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE)
            IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
      `,
    }),
  ]
).enableRLS();

export type ExamResult = typeof examResults.$inferSelect;
export type NewExamResult = typeof examResults.$inferInsert;
export type ItemResponseLogEntry = typeof itemResponseLog.$inferSelect;
export type NewItemResponseLogEntry = typeof itemResponseLog.$inferInsert;
