import {
  pgTable,
  text,
  uuid,
  jsonb,
  boolean,
  timestamp,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId } from './_shared';
import { tenants } from './tenants';
import { users } from './core';

// ─── Lesson Pipeline Templates ──────────────────────────────────────────────

export const lesson_pipeline_templates = pgTable(
  'lesson_pipeline_templates',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    description: text('description'),
    nodes: jsonb('nodes').notNull().default([]),
    config: jsonb('config').notNull().default({}),
    is_system: boolean('is_system').notNull().default(false),
    created_by: uuid('created_by').references(() => users.id),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    pgPolicy('lesson_pipeline_templates_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        OR is_system = TRUE
      `,
      withCheck: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
      `,
    }),
  ]
).enableRLS();

// ─── Type Exports ─────────────────────────────────────────────────────────

export type LessonPipelineTemplate =
  typeof lesson_pipeline_templates.$inferSelect;
export type NewLessonPipelineTemplate =
  typeof lesson_pipeline_templates.$inferInsert;
