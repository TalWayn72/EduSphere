/**
 * submissions.ts — Text submission + plagiarism detection tables (F-005)
 *
 * text_submissions   — stores learner text assignment submissions (PII: text_content)
 * submission_embeddings — 768-dim pgvector embeddings for cosine similarity
 *
 * RLS:
 *   text_submissions      — users see own; instructors/admins see all in tenant
 *   submission_embeddings — tenant isolation (instructors need cross-user access)
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  vector,
  pgPolicy,
  boolean,
  real,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── text_submissions ──────────────────────────────────────────────────────────

export const textSubmissions = pgTable(
  'text_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    contentItemId: uuid('content_item_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    courseId: uuid('course_id').notNull(),
    textContent: text('text_content').notNull(),
    wordCount: integer('word_count').notNull().default(0),
    isFlagged: boolean('is_flagged').notNull().default(false),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    pgPolicy('text_submissions_rls', {
      using: sql`
        (user_id::text = current_setting('app.current_user_id', TRUE)
          AND tenant_id::text = current_setting('app.current_tenant', TRUE))
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      `,
      withCheck: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        AND tenant_id::text = current_setting('app.current_tenant', TRUE)
      `,
    }),
  ]
).enableRLS();

// ── submission_embeddings ─────────────────────────────────────────────────────

export const submissionEmbeddings = pgTable(
  'submission_embeddings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submissionId: uuid('submission_id').notNull().unique(),
    tenantId: uuid('tenant_id').notNull(),
    courseId: uuid('course_id').notNull(),
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    highestSimilarity: real('highest_similarity').notNull().default(0),
    checkedAt: timestamp('checked_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    pgPolicy('submission_embeddings_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
      `,
      withCheck: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
      `,
    }),
  ]
).enableRLS();

// SQL for HNSW index (applied via migration)
export const submissionEmbeddingsIndex = sql`
CREATE INDEX IF NOT EXISTS idx_submission_embeddings_hnsw
  ON submission_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_submission_embeddings_tenant
  ON submission_embeddings (tenant_id, course_id);

CREATE INDEX IF NOT EXISTS idx_text_submissions_user
  ON text_submissions (user_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_text_submissions_content_item
  ON text_submissions (content_item_id, tenant_id);
`;

export type TextSubmission = typeof textSubmissions.$inferSelect;
export type NewTextSubmission = typeof textSubmissions.$inferInsert;
export type SubmissionEmbedding = typeof submissionEmbeddings.$inferSelect;
export type NewSubmissionEmbedding = typeof submissionEmbeddings.$inferInsert;
