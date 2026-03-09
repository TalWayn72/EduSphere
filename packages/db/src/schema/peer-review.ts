/**
 * Peer Review & Discussion Likes — Phase 45 Social Learning
 *
 * Tables:
 *  - peer_review_rubrics: rubric definitions per content item (tenant-scoped)
 *  - peer_review_assignments: submitter→reviewer assignments with feedback/scores
 *  - discussion_message_likes: per-message like tracking (unique per user)
 *
 * RLS:
 *  - peer_review_rubrics: tenant isolation (instructors/admins create, all read)
 *  - peer_review_assignments: tenant + participant isolation
 *    (submitter/reviewer see own; INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN see all in tenant)
 *  - discussion_message_likes: tenant isolation
 *
 * Security Invariant SI-1: uses app.current_user_id (NOT app.current_user)
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  pgPolicy,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// RubricCriteria — TypeScript interface for jsonb column
// ---------------------------------------------------------------------------

export interface RubricCriteria {
  id: string;
  label: string;
  description: string;
  maxScore: number;
}

// ---------------------------------------------------------------------------
// peer_review_rubrics — rubric definitions per content item
// ---------------------------------------------------------------------------

export const peerReviewRubrics = pgTable(
  'peer_review_rubrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    contentItemId: uuid('content_item_id').notNull(),
    criteria: jsonb('criteria').notNull().$type<RubricCriteria[]>(),
    minReviewers: integer('min_reviewers').notNull().default(3),
    isAnonymous: boolean('is_anonymous').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_peer_rubrics_content').on(t.contentItemId),
    pgPolicy('peer_rubrics_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ---------------------------------------------------------------------------
// peer_review_assignments — submitter→reviewer pairing with feedback
// ---------------------------------------------------------------------------

export const peerReviewAssignments = pgTable(
  'peer_review_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    contentItemId: uuid('content_item_id').notNull(),
    submitterId: uuid('submitter_id').notNull(),
    reviewerId: uuid('reviewer_id').notNull(),
    // PENDING | SUBMITTED | RATED
    status: text('status').notNull().default('PENDING'),
    submissionText: text('submission_text'),
    feedback: text('feedback'),
    score: integer('score'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_peer_assignments_submitter').on(t.submitterId),
    index('idx_peer_assignments_reviewer').on(t.reviewerId),
    pgPolicy('peer_assignments_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          submitter_id::text = current_setting('app.current_user_id', TRUE)
          OR reviewer_id::text = current_setting('app.current_user_id', TRUE)
          OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
        )
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// Note: socialFeedItems table is defined in social.ts (exported from there)

// ---------------------------------------------------------------------------
// discussion_message_likes — one like per (message, user) pair
// ---------------------------------------------------------------------------

export const discussionMessageLikes = pgTable(
  'discussion_message_likes',
  {
    messageId: uuid('message_id').notNull(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.messageId, t.userId] }),
    uniqueIndex('idx_discussion_like_unique').on(t.messageId, t.userId),
    index('idx_discussion_likes_message').on(t.messageId),
    pgPolicy('discussion_likes_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type PeerReviewRubric = typeof peerReviewRubrics.$inferSelect;
export type NewPeerReviewRubric = typeof peerReviewRubrics.$inferInsert;

export type PeerReviewAssignment = typeof peerReviewAssignments.$inferSelect;
export type NewPeerReviewAssignment = typeof peerReviewAssignments.$inferInsert;

export type DiscussionMessageLike = typeof discussionMessageLikes.$inferSelect;
export type NewDiscussionMessageLike = typeof discussionMessageLikes.$inferInsert;

// SocialFeedItem types are exported from social.ts
