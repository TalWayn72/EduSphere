/**
 * Exam Blueprints — Certification Exam System
 *
 * Defines exam specifications: time limits, passing criteria, domain/bloom
 * distributions, CAT parameters, retake policies, and result display options.
 *
 * RLS: instructors/admins manage blueprints; students can read ACTIVE ones.
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  real,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  pgEnum,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { courses } from '../content';
import { users } from '../core';

// ── Enums ──────────────────────────────────────────────────────────────────

export const passingMethodEnum = pgEnum('passing_method', [
  'PERCENTAGE',
  'SCALED_SCORE',
  'IRT_THETA',
]);

export const blueprintStatusEnum = pgEnum('blueprint_status', [
  'DRAFT',
  'ACTIVE',
  'ARCHIVED',
]);

// ── exam_blueprints ────────────────────────────────────────────────────────

export const examBlueprints = pgTable(
  'exam_blueprints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    timeLimitMinutes: integer('time_limit_minutes').notNull().default(120),
    totalQuestions: integer('total_questions').notNull(),
    passingScore: real('passing_score').notNull().default(700),
    passingMethod: passingMethodEnum('passing_method')
      .notNull()
      .default('SCALED_SCORE'),
    domainDistribution: jsonb('domain_distribution'),
    bloomDistribution: jsonb('bloom_distribution'),
    difficultyRange: jsonb('difficulty_range'),
    shuffleQuestions: boolean('shuffle_questions').notNull().default(true),
    shuffleAnswers: boolean('shuffle_answers').notNull().default(true),
    maxRetakes: integer('max_retakes').notNull().default(3),
    retakeCooldownHours: integer('retake_cooldown_hours').notNull().default(24),
    showResultsImmediately: boolean('show_results_immediately')
      .notNull()
      .default(true),
    showCorrectAnswers: boolean('show_correct_answers')
      .notNull()
      .default(false),
    isAdaptive: boolean('is_adaptive').notNull().default(false),
    catMinItems: integer('cat_min_items'),
    catMaxItems: integer('cat_max_items'),
    catSeThreshold: real('cat_se_threshold').default(0.3),
    catConfidenceThreshold: real('cat_confidence_threshold').default(0.95),
    status: blueprintStatusEnum('status').notNull().default('DRAFT'),
    version: integer('version').notNull().default(1),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_exam_blueprints_tenant').on(t.tenantId),
    index('idx_exam_blueprints_course').on(t.courseId),
    index('idx_exam_blueprints_status').on(t.status),
    pgPolicy('exam_blueprints_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          current_setting('app.current_user_role', TRUE)
              IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
          OR status = 'ACTIVE'
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

export type ExamBlueprint = typeof examBlueprints.$inferSelect;
export type NewExamBlueprint = typeof examBlueprints.$inferInsert;
