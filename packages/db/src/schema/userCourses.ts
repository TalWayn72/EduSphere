import { pgTable, uuid, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { courses } from './courses';

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
  'ACTIVE',
  'COMPLETED',
  'DROPPED',
  'SUSPENDED',
]);

export const userCourses = pgTable('user_courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  status: enrollmentStatusEnum('status').notNull().default('ACTIVE'),
  enrolledAt: timestamp('enrolled_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const userCoursesRLS = sql`
CREATE POLICY user_courses_isolation ON user_courses
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = user_courses.course_id
      AND courses.tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );

ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;
`;

export const userCoursesIndexes = sql`
CREATE INDEX idx_user_courses_user ON user_courses(user_id);
CREATE INDEX idx_user_courses_course ON user_courses(course_id);
CREATE INDEX idx_user_courses_status ON user_courses(status);
CREATE UNIQUE INDEX idx_user_courses_unique ON user_courses(user_id, course_id);
`;

export type UserCourse = typeof userCourses.$inferSelect;
export type NewUserCourse = typeof userCourses.$inferInsert;
