/**
 * Social Learning Events (Phase 45)
 *
 * Covers: social feed, peer review, discussion replies, user follows
 */

// ─── Social Feed Events ─────────────────────────────────────────────────────

export interface SocialFeedItemPayload {
  readonly actorId: string;
  readonly tenantId: string;
  readonly verb: 'COMPLETED' | 'ENROLLED' | 'ACHIEVED_BADGE' | 'DISCUSSED' | 'STARTED_LEARNING';
  readonly objectType: string;
  readonly objectId: string;
  readonly objectTitle: string;
  readonly timestamp: string;
}

// ─── Peer Review Events ──────────────────────────────────────────────────────

export interface PeerReviewAssignedPayload {
  readonly assignmentId: string;
  readonly reviewerId: string;
  readonly submitterId: string;
  readonly contentItemTitle: string;
  readonly tenantId: string;
  readonly timestamp: string;
}

export interface PeerReviewCompletedPayload {
  readonly assignmentId: string;
  readonly submitterId: string;
  readonly contentItemTitle: string;
  readonly tenantId: string;
  readonly reviewCount: number;
  readonly timestamp: string;
}

// ─── Discussion Events ───────────────────────────────────────────────────────

export interface DiscussionReplyPayload {
  readonly discussionId: string;
  readonly messageId: string;
  readonly authorId: string;
  readonly recipientId: string;
  readonly discussionTitle: string;
  readonly tenantId: string;
  readonly timestamp: string;
}

// ─── Social Follow Events (F-035 Social Following System) ────────────────────

export interface UserFollowedPayload {
  readonly followerId: string;
  readonly followingId: string;
  readonly tenantId: string;
  readonly timestamp: string; // ISO 8601
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isSocialFeedItemEvent(e: unknown): e is SocialFeedItemPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['actorId'] === 'string' &&
    typeof obj['tenantId'] === 'string' &&
    typeof obj['objectId'] === 'string'
  );
}

export function isPeerReviewAssignedEvent(e: unknown): e is PeerReviewAssignedPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['assignmentId'] === 'string' &&
    typeof obj['reviewerId'] === 'string' &&
    typeof obj['submitterId'] === 'string'
  );
}

export function isPeerReviewCompletedEvent(e: unknown): e is PeerReviewCompletedPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['assignmentId'] === 'string' &&
    typeof obj['submitterId'] === 'string' &&
    typeof obj['reviewCount'] === 'number'
  );
}

export function isDiscussionReplyEvent(e: unknown): e is DiscussionReplyPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['discussionId'] === 'string' &&
    typeof obj['messageId'] === 'string' &&
    typeof obj['recipientId'] === 'string'
  );
}

export function isUserFollowedEvent(e: unknown): e is UserFollowedPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['followerId'] === 'string' &&
    typeof obj['followingId'] === 'string' &&
    typeof obj['tenantId'] === 'string'
  );
}
