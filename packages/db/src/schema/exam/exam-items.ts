/**
 * Exam Item Bank + Embeddings — Certification Exam System
 *
 * Tables:
 *   exam_items           — IRT-calibrated item bank (per-tenant, per-course)
 *   exam_item_embeddings — pgvector 768-dim for deduplication / similarity
 *
 * RLS: instructors/admins see all items in tenant; students have NO direct access.
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
  vector,
  pgEnum,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { courses } from '../content';
import { modules } from '../content';
import { users } from '../core';

// ── Enums ──────────────────────────────────────────────────────────────────

export const bloomLevelEnum = pgEnum('bloom_level', [
  'REMEMBER',
  'UNDERSTAND',
  'APPLY',
  'ANALYZE',
  'EVALUATE',
  'CREATE',
]);

export const calibrationStatusEnum = pgEnum('calibration_status', [
  'DRAFT',
  'PILOT',
  'CALIBRATED',
  'RETIRED',
]);

export const examItemSourceEnum = pgEnum('exam_item_source', [
  'MANUAL',
  'AI_GENERATED',
  'IMPORTED',
]);

export const qualityTierEnum = pgEnum('quality_tier', [
  'AI_GENERATED',
  'SME_REVIEWED',
  'PILOT_TESTED',
  'CALIBRATED',
]);

// ── exam_items ─────────────────────────────────────────────────────────────

export const examItems = pgTable(
  'exam_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    moduleId: uuid('module_id').references(() => modules.id, {
      onDelete: 'set null',
    }),
    domainTag: varchar('domain_tag', { length: 100 }),
    bloomLevel: bloomLevelEnum('bloom_level').notNull().default('REMEMBER'),
    questionData: jsonb('question_data').notNull(),
    irtA: real('irt_a').notNull().default(1.0),
    irtB: real('irt_b').notNull().default(0.0),
    irtC: real('irt_c').notNull().default(0.25),
    calibrationStatus: calibrationStatusEnum('calibration_status')
      .notNull()
      .default('DRAFT'),
    source: examItemSourceEnum('source').notNull().default('MANUAL'),
    qualityTier: qualityTierEnum('quality_tier')
      .notNull()
      .default('AI_GENERATED'),
    iwfFlags: jsonb('iwf_flags').notNull().default([]),
    pValue: real('p_value'),
    rPbis: real('r_pbis'),
    dIndex: real('d_index'),
    distractorStats: jsonb('distractor_stats'),
    exposureCount: integer('exposure_count').notNull().default(0),
    difFlagged: boolean('dif_flagged').notNull().default(false),
    generationMetadata: jsonb('generation_metadata'),
    reviewNotes: text('review_notes'),
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
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_exam_items_tenant').on(t.tenantId),
    index('idx_exam_items_course').on(t.courseId),
    index('idx_exam_items_module').on(t.moduleId),
    index('idx_exam_items_bloom').on(t.bloomLevel),
    index('idx_exam_items_calibration').on(t.calibrationStatus),
    pgPolicy('exam_items_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE)
            IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
      `,
      withCheck: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE)
            IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
      `,
    }),
  ]
).enableRLS();

// ── exam_item_embeddings (pgvector 768-dim) ────────────────────────────────

export const examItemEmbeddings = pgTable(
  'exam_item_embeddings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .unique()
      .references(() => examItems.id, { onDelete: 'cascade' }),
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    pgPolicy('exam_item_embeddings_rls', {
      using: sql`
        EXISTS (
          SELECT 1 FROM exam_items ei
          WHERE ei.id = ${t.itemId}
            AND ei.tenant_id::text = current_setting('app.current_tenant', TRUE)
            AND current_setting('app.current_user_role', TRUE)
                IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
        )
      `,
      withCheck: sql`
        EXISTS (
          SELECT 1 FROM exam_items ei
          WHERE ei.id = ${t.itemId}
            AND ei.tenant_id::text = current_setting('app.current_tenant', TRUE)
            AND current_setting('app.current_user_role', TRUE)
                IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
        )
      `,
    }),
  ]
).enableRLS();

export const examItemEmbeddingsHnswIdx = sql`
CREATE INDEX IF NOT EXISTS idx_exam_item_embeddings_hnsw
  ON exam_item_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
`;

export type ExamItem = typeof examItems.$inferSelect;
export type NewExamItem = typeof examItems.$inferInsert;
export type ExamItemEmbedding = typeof examItemEmbeddings.$inferSelect;
export type NewExamItemEmbedding = typeof examItemEmbeddings.$inferInsert;
