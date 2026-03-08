// Course Lesson Builder — WYSIWYG lesson authoring tables (Phase 36)
// Distinct from lesson_pipelines (AI processing pipeline) — this models
// ordered content steps: VIDEO, QUIZ, DISCUSSION, AI_CHAT, SUMMARY.
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { pk, tenantId } from './_shared';

export const courseLessonPlanStatusEnum = pgEnum('course_lesson_plan_status', [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]);

export const lessonStepTypeEnum = pgEnum('lesson_step_type', [
  'VIDEO',
  'QUIZ',
  'DISCUSSION',
  'AI_CHAT',
  'SUMMARY',
]);

export const course_lesson_plans = pgTable(
  'course_lesson_plans',
  {
    id: pk(),
    course_id: uuid('course_id').notNull(),
    tenant_id: tenantId(),
    title: text('title').notNull(),
    status: courseLessonPlanStatusEnum('status').notNull().default('DRAFT'),
    created_by: uuid('created_by').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_lesson_plans_course').on(t.course_id),
    index('idx_lesson_plans_tenant').on(t.tenant_id),
  ]
);

export const course_lesson_steps = pgTable(
  'course_lesson_steps',
  {
    id: pk(),
    plan_id: uuid('plan_id').notNull(),
    step_type: lessonStepTypeEnum('step_type').notNull(),
    step_order: integer('step_order').notNull().default(0),
    config: jsonb('config').notNull().default({}),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('idx_lesson_steps_plan').on(t.plan_id)]
);

export type CourseLessonPlan = typeof course_lesson_plans.$inferSelect;
export type NewCourseLessonPlan = typeof course_lesson_plans.$inferInsert;
export type CourseLessonStep = typeof course_lesson_steps.$inferSelect;
export type NewCourseLessonStep = typeof course_lesson_steps.$inferInsert;
