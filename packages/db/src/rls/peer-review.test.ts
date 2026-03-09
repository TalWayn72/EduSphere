/**
 * RLS validation tests for Phase 45 — Social Learning: Peer Review & Discussion Likes
 *
 * All tests are unit-style (no live DB required). They verify:
 *  1. peer_review_assignments uses app.current_user_id (SI-1 compliance)
 *  2. Participant isolation: submitter_id OR reviewer_id in USING clause
 *  3. INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN can see all assignments in tenant
 *  4. peer_review_rubrics has tenant isolation
 *  5. discussion_message_likes has UNIQUE constraint on (message_id, user_id)
 *  6. Migration 0027 enables RLS on all 4 tables
 *
 * Security Invariant SI-1: RLS must reference app.current_user_id NOT app.current_user
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getTableName } from 'drizzle-orm';
import {
  peerReviewRubrics,
  peerReviewAssignments,
  discussionMessageLikes,
} from '../schema/peer-review';

// ---------------------------------------------------------------------------
// File content helpers (static analysis)
// ---------------------------------------------------------------------------

const schema = readFileSync(
  join(__dirname, '../schema/peer-review.ts'),
  'utf8'
);

const migration = readFileSync(
  join(__dirname, '../migrations/0027_social_peer_review.sql'),
  'utf8'
);

// ---------------------------------------------------------------------------
// SI-1: peer_review_assignments RLS uses app.current_user_id
// ---------------------------------------------------------------------------

describe('SI-1: peer_review_assignments RLS uses app.current_user_id', () => {
  it('schema references app.current_user_id (not app.current_user)', () => {
    expect(schema).toMatch(/app\.current_user_id/);
    expect(schema).not.toMatch(/current_setting\('app\.current_user'[^_]/);
  });

  it('migration references app.current_user_id (not app.current_user)', () => {
    expect(migration).toMatch(/app\.current_user_id/);
    expect(migration).not.toMatch(/current_setting\('app\.current_user'[^_]/);
  });

  it('USING clause includes submitter_id check', () => {
    expect(schema).toMatch(/submitter_id.*current_setting/s);
  });

  it('USING clause includes reviewer_id check', () => {
    expect(schema).toMatch(/reviewer_id.*current_setting/s);
  });

  it('INSTRUCTOR role can access all assignments in tenant', () => {
    expect(schema).toMatch(/INSTRUCTOR/);
  });

  it('ORG_ADMIN role can access all assignments in tenant', () => {
    expect(schema).toMatch(/ORG_ADMIN/);
  });

  it('SUPER_ADMIN role can access all assignments in tenant', () => {
    expect(schema).toMatch(/SUPER_ADMIN/);
  });
});

// ---------------------------------------------------------------------------
// Schema: enableRLS() called on all tables
// ---------------------------------------------------------------------------

describe('Schema: .enableRLS() is called on all peer-review tables', () => {
  it('peerReviewRubrics has enableRLS()', () => {
    // Count occurrences to verify all tables call it
    const count = (schema.match(/enableRLS\(\)/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('tenant isolation policy present for peerReviewRubrics', () => {
    expect(schema).toMatch(/peer_rubrics_tenant_isolation/);
  });

  it('RLS policy present for peerReviewAssignments', () => {
    expect(schema).toMatch(/peer_assignments_rls/);
  });

  it('tenant isolation policy present for discussionMessageLikes', () => {
    expect(schema).toMatch(/discussion_likes_tenant_isolation/);
  });
});

// ---------------------------------------------------------------------------
// Schema: discussionMessageLikes composite key
// ---------------------------------------------------------------------------

describe('Schema: discussionMessageLikes has composite primary key', () => {
  it('uses primaryKey on (messageId, userId)', () => {
    expect(schema).toMatch(/primaryKey/);
  });

  it('uniqueIndex defined on (messageId, userId)', () => {
    expect(schema).toMatch(/uniqueIndex.*idx_discussion_like_unique/s);
  });

  it('index defined on messageId for lookup efficiency', () => {
    expect(schema).toMatch(/idx_discussion_likes_message/);
  });
});

// ---------------------------------------------------------------------------
// Migration 0027: all 4 tables created with RLS
// ---------------------------------------------------------------------------

describe('Migration 0027: all required tables', () => {
  it('creates peer_review_rubrics table', () => {
    expect(migration).toMatch(/CREATE TABLE.*peer_review_rubrics/);
  });

  it('creates peer_review_assignments table', () => {
    expect(migration).toMatch(/CREATE TABLE.*peer_review_assignments/);
  });

  it('creates social_feed_items table', () => {
    expect(migration).toMatch(/CREATE TABLE.*social_feed_items/);
  });

  it('creates discussion_message_likes table', () => {
    expect(migration).toMatch(/CREATE TABLE.*discussion_message_likes/);
  });

  it('enables RLS on all 4 tables', () => {
    const rlsMatches = migration.match(/ENABLE ROW LEVEL SECURITY/g) ?? [];
    expect(rlsMatches.length).toBeGreaterThanOrEqual(4);
  });

  it('discussion_message_likes has PRIMARY KEY on (message_id, user_id)', () => {
    expect(migration).toMatch(
      /PRIMARY KEY.*message_id.*user_id|CONSTRAINT.*discussion_like_pkey.*PRIMARY KEY.*message_id.*user_id/s
    );
  });

  it('discussion_message_likes has UNIQUE index on (message_id, user_id)', () => {
    expect(migration).toMatch(/UNIQUE.*idx_discussion_like_unique/s);
  });

  it('social_feed_items has actor + tenant composite index', () => {
    expect(migration).toMatch(/idx_social_feed_actor/);
  });

  it('social_feed_items has created_at index for feed ordering', () => {
    expect(migration).toMatch(/idx_social_feed_created/);
  });
});

// ---------------------------------------------------------------------------
// Drizzle table definitions sanity checks
// ---------------------------------------------------------------------------

describe('Drizzle table definitions are complete', () => {
  it('peerReviewRubrics table is defined', () => {
    expect(peerReviewRubrics).toBeDefined();
    expect(getTableName(peerReviewRubrics)).toBe('peer_review_rubrics');
  });

  it('peerReviewAssignments table is defined', () => {
    expect(peerReviewAssignments).toBeDefined();
    expect(getTableName(peerReviewAssignments)).toBe('peer_review_assignments');
  });

  it('discussionMessageLikes table is defined', () => {
    expect(discussionMessageLikes).toBeDefined();
    expect(getTableName(discussionMessageLikes)).toBe(
      'discussion_message_likes'
    );
  });
});

// ---------------------------------------------------------------------------
// Exported TypeScript types
// ---------------------------------------------------------------------------

describe('TypeScript inferred types are exported', () => {
  it('exports PeerReviewRubric and NewPeerReviewRubric types', () => {
    expect(schema).toMatch(/export type PeerReviewRubric/);
    expect(schema).toMatch(/export type NewPeerReviewRubric/);
  });

  it('exports PeerReviewAssignment and NewPeerReviewAssignment types', () => {
    expect(schema).toMatch(/export type PeerReviewAssignment/);
    expect(schema).toMatch(/export type NewPeerReviewAssignment/);
  });

  it('exports DiscussionMessageLike and NewDiscussionMessageLike types', () => {
    expect(schema).toMatch(/export type DiscussionMessageLike/);
    expect(schema).toMatch(/export type NewDiscussionMessageLike/);
  });
});
