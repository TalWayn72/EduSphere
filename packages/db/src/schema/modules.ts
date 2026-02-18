import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { courses } from './courses';

export const modules = pgTable('modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const modulesRLS = sql`
CREATE POLICY modules_tenant_isolation ON modules
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = modules.course_id
      AND courses.tenant_id::text = current_setting('app.current_tenant', TRUE)
    )
  );

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
`;

export const modulesIndexes = sql`
CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_modules_order ON modules(course_id, order_index);
`;

export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;
