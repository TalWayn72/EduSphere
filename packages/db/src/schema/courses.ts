import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './users';

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  instructorId: uuid('instructor_id').notNull().references(() => users.id),
  isPublished: boolean('is_published').notNull().default(false),
  estimatedHours: integer('estimated_hours'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const coursesRLS = sql`
CREATE POLICY courses_tenant_isolation ON courses
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
`;

export const coursesIndexes = sql`
CREATE INDEX idx_courses_tenant ON courses(tenant_id);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_published ON courses(is_published);
CREATE UNIQUE INDEX idx_courses_tenant_slug ON courses(tenant_id, slug);
`;

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
