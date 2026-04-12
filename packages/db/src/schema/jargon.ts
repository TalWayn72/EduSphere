import {
  pgTable,
  text,
  uuid,
  jsonb,
  numeric,
  unique,
  index,
  pgPolicy,
  vector,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId, timestamps, softDelete } from './_shared';
import { tenants } from './tenants';
import { lessons } from './lesson';
import { transcript_segments } from './content';
import { enriched_transcript_blocks } from './enriched-transcript';

// ─── Jargon Domains ────────────────────────────────────────────────────────
// Subject areas / ontological domains for professional terminology.
export const jargon_domains = pgTable(
  'jargon_domains',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    language: text('language').notNull().default('he'),
    parent_domain_id: uuid('parent_domain_id'),
    metadata: jsonb('metadata').notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    unique('jargon_domains_tenant_name_unique').on(t.tenant_id, t.name),
    index('idx_jargon_domains_tenant').on(t.tenant_id),
    index('idx_jargon_domains_tenant_name').on(t.tenant_id, t.name),
    pgPolicy('jargon_domains_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── Jargon Terms ──────────────────────────────────────────────────────────
// Individual professional terms / jargon entries within a domain.
export const jargon_terms = pgTable(
  'jargon_terms',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    domain_id: uuid('domain_id')
      .notNull()
      .references(() => jargon_domains.id, { onDelete: 'cascade' }),
    canonical_form: text('canonical_form').notNull(),
    phonetic_hint: text('phonetic_hint'),
    alt_forms: jsonb('alt_forms').notNull().default([]),
    definition_short: text('definition_short'),
    definition_full: text('definition_full'),
    language: text('language').notNull().default('he'),
    source: text('source', {
      enum: ['AUTO', 'MANUAL', 'IMPORTED'],
    })
      .notNull()
      .default('AUTO'),
    confidence: numeric('confidence', { precision: 5, scale: 4 }),
    graph_term_id: text('graph_term_id'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    unique('jargon_terms_tenant_domain_form_unique').on(
      t.tenant_id,
      t.domain_id,
      t.canonical_form
    ),
    index('idx_jargon_terms_tenant').on(t.tenant_id),
    index('idx_jargon_terms_domain').on(t.domain_id),
    pgPolicy('jargon_terms_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── Jargon Term Embeddings ────────────────────────────────────────────────
// pgvector embeddings for semantic similarity search on jargon terms.
// RLS: tenant isolation via join to jargon_terms.tenant_id
export const jargon_term_embeddings = pgTable(
  'jargon_term_embeddings',
  {
    id: pk(),
    term_id: uuid('term_id')
      .notNull()
      .references(() => jargon_terms.id, { onDelete: 'cascade' })
      .unique(),
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_jargon_term_embeddings_term').on(t.term_id),
    pgPolicy('jargon_term_embeddings_rls', {
      using: sql`
        EXISTS (
          SELECT 1 FROM jargon_terms jt
          WHERE jt.id = ${t.term_id}
            AND jt.tenant_id::text = current_setting('app.current_tenant', TRUE)
        )
      `,
    }),
  ]
).enableRLS();

// HNSW index for cosine similarity search on jargon term embeddings
export const jargonTermEmbeddingsHnswIdx = sql`
CREATE INDEX IF NOT EXISTS idx_jargon_term_embeddings_hnsw
  ON jargon_term_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 128);
`;

// ─── Domain Proximity ──────────────────────────────────────────────────────
// Pre-computed vector distance scores between domain pairs.
export const domain_proximity = pgTable(
  'domain_proximity',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    domain_a_id: uuid('domain_a_id')
      .notNull()
      .references(() => jargon_domains.id, { onDelete: 'cascade' }),
    domain_b_id: uuid('domain_b_id')
      .notNull()
      .references(() => jargon_domains.id, { onDelete: 'cascade' }),
    proximity_score: numeric('proximity_score', {
      precision: 5,
      scale: 4,
    }).notNull(),
    ...timestamps,
  },
  (t) => [
    unique('domain_proximity_tenant_pair_unique').on(
      t.tenant_id,
      t.domain_a_id,
      t.domain_b_id
    ),
    index('idx_domain_proximity_tenant').on(t.tenant_id),
    index('idx_domain_proximity_domain_a').on(t.domain_a_id),
    pgPolicy('domain_proximity_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── Lesson Domain Assignments ─────────────────────────────────────────────
// Maps lessons to jargon domains (auto-detected or instructor-confirmed).
// RLS: tenant isolation via join to lessons.tenant_id
export const lesson_domain_assignments = pgTable(
  'lesson_domain_assignments',
  {
    id: pk(),
    lesson_id: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    domain_id: uuid('domain_id')
      .notNull()
      .references(() => jargon_domains.id, { onDelete: 'cascade' }),
    detection_method: text('detection_method', {
      enum: ['AUTO', 'INSTRUCTOR_CONFIRMED', 'MANUAL'],
    }).notNull(),
    confidence: numeric('confidence', { precision: 5, scale: 4 }),
    ...timestamps,
  },
  (t) => [
    unique('lesson_domain_assignments_lesson_domain_unique').on(
      t.lesson_id,
      t.domain_id
    ),
    index('idx_lesson_domain_assignments_lesson').on(t.lesson_id),
    index('idx_lesson_domain_assignments_domain').on(t.domain_id),
    pgPolicy('lesson_domain_assignments_rls', {
      using: sql`
        EXISTS (
          SELECT 1 FROM lessons l
          WHERE l.id = ${t.lesson_id}
            AND l.tenant_id::text = current_setting('app.current_tenant', TRUE)
        )
      `,
    }),
  ]
).enableRLS();

// ─── Jargon Occurrences ────────────────────────────────────────────────────
// Records where jargon terms appear in lesson transcripts / enriched blocks.
// RLS: tenant isolation via join to lessons.tenant_id
export const jargon_occurrences = pgTable(
  'jargon_occurrences',
  {
    id: pk(),
    lesson_id: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    term_id: uuid('term_id')
      .notNull()
      .references(() => jargon_terms.id, { onDelete: 'cascade' }),
    segment_id: uuid('segment_id').references(() => transcript_segments.id, {
      onDelete: 'set null',
    }),
    block_id: uuid('block_id').references(
      () => enriched_transcript_blocks.id,
      { onDelete: 'set null' }
    ),
    start_time: numeric('start_time', { precision: 10, scale: 3 }),
    end_time: numeric('end_time', { precision: 10, scale: 3 }),
    original_text: text('original_text').notNull(),
    corrected_text: text('corrected_text'),
    confidence: numeric('confidence', { precision: 5, scale: 4 }),
    ...timestamps,
  },
  (t) => [
    index('idx_jargon_occurrences_lesson_term').on(t.lesson_id, t.term_id),
    index('idx_jargon_occurrences_lesson').on(t.lesson_id),
    index('idx_jargon_occurrences_term').on(t.term_id),
    pgPolicy('jargon_occurrences_rls', {
      using: sql`
        EXISTS (
          SELECT 1 FROM lessons l
          WHERE l.id = ${t.lesson_id}
            AND l.tenant_id::text = current_setting('app.current_tenant', TRUE)
        )
      `,
    }),
  ]
).enableRLS();

// ─── TypeScript Types ──────────────────────────────────────────────────────

export type JargonDomain = typeof jargon_domains.$inferSelect;
export type NewJargonDomain = typeof jargon_domains.$inferInsert;

export type JargonTerm = typeof jargon_terms.$inferSelect;
export type NewJargonTerm = typeof jargon_terms.$inferInsert;

export type JargonTermEmbedding = typeof jargon_term_embeddings.$inferSelect;
export type NewJargonTermEmbedding = typeof jargon_term_embeddings.$inferInsert;

export type DomainProximity = typeof domain_proximity.$inferSelect;
export type NewDomainProximity = typeof domain_proximity.$inferInsert;

export type LessonDomainAssignment =
  typeof lesson_domain_assignments.$inferSelect;
export type NewLessonDomainAssignment =
  typeof lesson_domain_assignments.$inferInsert;

export type JargonOccurrence = typeof jargon_occurrences.$inferSelect;
export type NewJargonOccurrence = typeof jargon_occurrences.$inferInsert;
