/**
 * Gateway, Submission & Poll Events + NATS Subject Constants
 *
 * Covers: gateway pub/sub, submission plagiarism detection (F-005),
 * live session polls (F-034), NATS subject registry
 */

// ─── Gateway Pub/Sub Events ──────────────────────────────────────────────────

export interface GatewayPubSubPayload {
  readonly topic: string;
  readonly data: Record<string, unknown>;
}

export function isGatewayPubSubEvent(e: unknown): e is GatewayPubSubPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['topic'] === 'string' &&
    obj['data'] !== null &&
    typeof obj['data'] === 'object'
  );
}

// ─── Submission Events (F-005 Plagiarism Detection) ──────────────────────────

export interface SubmissionCreatedPayload {
  readonly submissionId: string;
  readonly tenantId: string;
  readonly courseId: string;
  readonly userId: string;
  readonly timestamp: string; // ISO 8601
}

export function isSubmissionCreatedEvent(
  e: unknown
): e is SubmissionCreatedPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['submissionId'] === 'string' &&
    typeof obj['tenantId'] === 'string' &&
    typeof obj['courseId'] === 'string'
  );
}

// ─── Live Session Poll Events (F-034 BBB Breakout Rooms + Polls) ─────────────

export interface PollVotePayload {
  readonly pollId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly optionIndex: number;
  readonly totalVotes: number;
  readonly results: Array<{ optionIndex: number; count: number }>;
}

export function isPollVoteEvent(e: unknown): e is PollVotePayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['pollId'] === 'string' &&
    typeof obj['sessionId'] === 'string' &&
    typeof obj['tenantId'] === 'string' &&
    typeof obj['totalVotes'] === 'number'
  );
}

// ─── NATS Subject Constants ──────────────────────────────────────────────────

export const NatsSubjects = {
  POLL_VOTED: 'EDUSPHERE.poll.voted',
  COURSE_ENROLLED: 'EDUSPHERE.course.enrolled',
  BADGE_ISSUED: 'EDUSPHERE.badge.issued',
  BADGE_REVOKED: 'EDUSPHERE.badge.revoked',
  LESSON_CREATED: 'EDUSPHERE.lesson.created',
  LESSON_ASSET_UPLOADED: 'EDUSPHERE.lesson.asset.uploaded',
  LESSON_PIPELINE_STARTED: 'EDUSPHERE.lesson.pipeline.started',
  LESSON_PIPELINE_MODULE_COMPLETED:
    'EDUSPHERE.lesson.pipeline.module.completed',
  LESSON_PIPELINE_COMPLETED: 'EDUSPHERE.lesson.pipeline.completed',
  LESSON_PUBLISHED: 'EDUSPHERE.lesson.published',
  // Phase 45 — Social Learning
  PEER_REVIEW_ASSIGNED: 'EDUSPHERE.peer.review.assigned',
  PEER_REVIEW_COMPLETED: 'EDUSPHERE.peer.review.completed',
  DISCUSSION_REPLY: 'EDUSPHERE.discussion.reply',
  SOCIAL_ACTIVITY_DIGEST: 'EDUSPHERE.social.activity.digest',
} as const;
