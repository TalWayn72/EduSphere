/**
 * Drizzle relations() definitions — 5 primary entity chains.
 *
 * These enable type-safe joins via db.query.* (relational query API).
 * Import this file in any module that needs relational queries.
 */
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './core';
import { courses, modules, media_assets } from './content';
import { lessons, lesson_assets, lesson_citations } from './lesson';
import { userCourses } from './userCourses';
import { userProgress } from './userProgress';
import { annotations } from './annotation';

// ── 1. tenants → courses → modules ──────────────────────────────────────────

export const tenantsRelations = relations(tenants, ({ many }) => ({
  courses: many(courses),
  users: many(users),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [courses.tenant_id],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [courses.creator_id],
    references: [users.id],
    relationName: 'courseCreator',
  }),
  instructor: one(users, {
    fields: [courses.instructor_id],
    references: [users.id],
    relationName: 'courseInstructor',
  }),
  modules: many(modules),
  lessons: many(lessons),
  userCourses: many(userCourses),
  mediaAssets: many(media_assets),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.course_id],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

// ── 2. courses → lessons → lesson_assets ────────────────────────────────────

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, {
    fields: [lessons.course_id],
    references: [courses.id],
  }),
  module: one(modules, {
    fields: [lessons.module_id],
    references: [modules.id],
  }),
  instructor: one(users, {
    fields: [lessons.instructor_id],
    references: [users.id],
  }),
  assets: many(lesson_assets),
  citations: many(lesson_citations),
}));

export const lessonAssetsRelations = relations(lesson_assets, ({ one }) => ({
  lesson: one(lessons, {
    fields: [lesson_assets.lesson_id],
    references: [lessons.id],
  }),
  mediaAsset: one(media_assets, {
    fields: [lesson_assets.media_asset_id],
    references: [media_assets.id],
  }),
}));

// ── 3. lessons → lesson_citations ───────────────────────────────────────────

export const lessonCitationsRelations = relations(
  lesson_citations,
  ({ one }) => ({
    lesson: one(lessons, {
      fields: [lesson_citations.lesson_id],
      references: [lessons.id],
    }),
  })
);

// ── 4. users → user_courses → user_progress ─────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenant_id],
    references: [tenants.id],
  }),
  enrollments: many(userCourses),
  progress: many(userProgress),
  annotations: many(annotations),
}));

export const userCoursesRelations = relations(userCourses, ({ one }) => ({
  user: one(users, {
    fields: [userCourses.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [userCourses.courseId],
    references: [courses.id],
  }),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
}));

// ── 5. annotations → users ──────────────────────────────────────────────────

export const annotationsRelations = relations(annotations, ({ one }) => ({
  user: one(users, {
    fields: [annotations.user_id],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [annotations.tenant_id],
    references: [tenants.id],
  }),
  mediaAsset: one(media_assets, {
    fields: [annotations.asset_id],
    references: [media_assets.id],
  }),
}));
