import {
  pgTable,
  text,
  uuid,
  jsonb,
  boolean,
  integer,
  numeric,
  unique,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId, timestamps } from './_shared';
import { tenants } from './tenants';
import { jargon_terms } from './jargon';
import { lessons } from './lesson';

// ─── Glossary Entries ──────────────────────────────────────────────────────
// One wiki page per jargon term — instructor-editable Markdown + LLM aggregation.
export const glossary_entries = pgTable(
  'glossary_entries',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    term_id: uuid('term_id')
      .notNull()
      .references(() => jargon_terms.id, { onDelete: 'cascade' })
      .unique(),
    wiki_content: text('wiki_content'),
    aggregated_definition: text('aggregated_definition'),
    aggregation_lesson_ids: jsonb('aggregation_lesson_ids')
      .notNull()
      .default(sql`'[]'::jsonb`),
    is_published: boolean('is_published').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index('idx_glossary_entries_tenant').on(t.tenant_id),
    index('idx_glossary_entries_term').on(t.term_id),
    index('idx_glossary_entries_tenant_published').on(
      t.tenant_id,
      t.is_published
    ),
    pgPolicy('glossary_entries_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── Glossary Lesson Refs ──────────────────────────────────────────────────
// Cross-references: which lessons contain a glossary term and with what weight.
// RLS: tenant isolation via join to glossary_entries.tenant_id
export const glossary_lesson_refs = pgTable(
  'glossary_lesson_refs',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    glossary_entry_id: uuid('glossary_entry_id')
      .notNull()
      .references(() => glossary_entries.id, { onDelete: 'cascade' }),
    lesson_id: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    occurrence_count: integer('occurrence_count').notNull().default(0),
    centrality_score: numeric('centrality_score', { precision: 5, scale: 4 })
      .notNull()
      .default('0'),
    first_mention_time: numeric('first_mention_time', {
      precision: 10,
      scale: 3,
    }),
    ...timestamps,
  },
  (t) => [
    unique('glossary_lesson_refs_entry_lesson_unique').on(
      t.glossary_entry_id,
      t.lesson_id
    ),
    index('idx_glossary_lesson_refs_tenant').on(t.tenant_id),
    index('idx_glossary_lesson_refs_entry').on(t.glossary_entry_id),
    index('idx_glossary_lesson_refs_lesson').on(t.lesson_id),
    pgPolicy('glossary_lesson_refs_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── TypeScript Types ──────────────────────────────────────────────────────

export type GlossaryEntry = typeof glossary_entries.$inferSelect;
export type NewGlossaryEntry = typeof glossary_entries.$inferInsert;

export type GlossaryLessonRef = typeof glossary_lesson_refs.$inferSelect;
export type NewGlossaryLessonRef = typeof glossary_lesson_refs.$inferInsert;
