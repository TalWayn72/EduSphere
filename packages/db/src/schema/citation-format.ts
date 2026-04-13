import {
  pgTable,
  text,
  uuid,
  jsonb,
  boolean,
  unique,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId, timestamps } from './_shared';
import { tenants } from './tenants';
import { courses } from './content';

// ─── Citation Format Configs ───────────────────────────────────────────────
// How a course cites sources — preset or custom format chosen by instructor.
// Preset values: JEWISH_TEXTS | APA | MLA | CHICAGO | CUSTOM
export const citation_format_configs = pgTable(
  'citation_format_configs',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    course_id: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    preset_name: text('preset_name').notNull(),
    format_description: text('format_description'),
    parsed_structure: jsonb('parsed_structure')
      .notNull()
      .default(sql`'{}'::jsonb`),
    is_active: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    unique('citation_format_configs_tenant_course_preset_unique').on(
      t.tenant_id,
      t.course_id,
      t.preset_name
    ),
    index('idx_citation_format_configs_tenant').on(t.tenant_id),
    index('idx_citation_format_configs_course').on(t.course_id),
    pgPolicy('citation_format_configs_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── TypeScript Types ──────────────────────────────────────────────────────

export type CitationFormatConfig = typeof citation_format_configs.$inferSelect;
export type NewCitationFormatConfig =
  typeof citation_format_configs.$inferInsert;
