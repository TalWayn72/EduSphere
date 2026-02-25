/**
 * EduSphere NATS Event Types
 *
 * These types are the TypeScript implementation of the AsyncAPI specification
 * defined in packages/nats-client/events.asyncapi.yaml
 *
 * IMPORTANT: When updating event schemas, update the AsyncAPI spec FIRST,
 * then update these types to match. The spec is the source of truth.
 */

// ─── Agent Session Events ────────────────────────────────────────────────────

export type AgentEventType =
  | 'session.created'
  | 'session.completed'
  | 'session.failed'
  | 'session.cancelled';

export type AgentMessageEventType =
  | 'message.created'
  | 'stream.chunk'
  | 'stream.end'
  | 'stream.error';

export interface AgentSessionPayload {
  readonly type: AgentEventType;
  readonly sessionId: string;
  readonly userId: string;
  readonly tenantId?: string;
  readonly data: Record<string, unknown>;
  readonly timestamp: string; // ISO 8601
}

export interface AgentMessagePayload {
  readonly type: AgentMessageEventType;
  readonly sessionId: string;
  readonly messageId?: string;
  readonly userId: string;
  readonly content?: string;
  readonly tokenCount?: number;
  readonly timestamp: string; // ISO 8601
}

// ─── Annotation Events ───────────────────────────────────────────────────────

export type AnnotationEventType =
  | 'annotation.created'
  | 'annotation.updated'
  | 'annotation.deleted'
  | 'annotation.resolved';

export type AnnotationLayer =
  | 'PERSONAL'
  | 'SHARED'
  | 'INSTRUCTOR'
  | 'AI_GENERATED';

export interface AnnotationPayload {
  readonly type: AnnotationEventType;
  readonly annotationId: string;
  readonly assetId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly layer?: AnnotationLayer;
  readonly timestamp: string; // ISO 8601
}

// ─── Content Events ──────────────────────────────────────────────────────────

export type ContentEventType =
  | 'content.created'
  | 'content.updated'
  | 'content.deleted'
  | 'content.published'
  | 'content.transcription.completed';

export interface ContentPayload {
  readonly type: ContentEventType;
  readonly contentItemId: string;
  readonly courseId?: string;
  readonly tenantId: string;
  readonly timestamp: string; // ISO 8601
}

// ─── Media Events ────────────────────────────────────────────────────────────

export interface MediaPayload {
  readonly assetId: string;
  readonly contentItemId: string;
  readonly tenantId: string;
  readonly storageKey: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
}

// ─── Transcription Events ────────────────────────────────────────────────────

export type TranscriptionEventType =
  | 'transcription.completed'
  | 'transcription.failed';

export interface TranscriptionPayload {
  readonly type: TranscriptionEventType;
  readonly assetId: string;
  readonly segmentCount?: number;
  readonly language?: string;
  readonly errorMessage?: string;
}

// ─── Knowledge Graph Events ──────────────────────────────────────────────────

export type KnowledgeConceptEventType =
  | 'knowledge.concepts.extracted'
  | 'knowledge.concepts.persisted';

export interface ExtractedConceptItem {
  readonly name: string;
  readonly description?: string;
  readonly relationships?: string[];
}

export interface KnowledgeConceptPayload {
  readonly type: KnowledgeConceptEventType;
  readonly assetId: string;
  readonly concepts: ExtractedConceptItem[];
}

// ─── Content Translation Events ──────────────────────────────────────────────

export interface ContentTranslationPayload {
  readonly contentItemId: string;
  readonly targetLanguage: string;
  readonly tenantId: string;
  readonly requestedBy?: string;
}

// ─── Gateway Pub/Sub Events ──────────────────────────────────────────────────

export interface GatewayPubSubPayload {
  readonly topic: string;
  readonly data: Record<string, unknown>;
}

// ─── Discriminated Union ─────────────────────────────────────────────────────

export type NatsEvent =
  | AgentSessionPayload
  | AgentMessagePayload
  | AnnotationPayload
  | ContentPayload
  | MediaPayload
  | TranscriptionPayload
  | KnowledgeConceptPayload
  | ContentTranslationPayload
  | GatewayPubSubPayload
  | UserFollowedPayload
  | PollVotePayload;

// ─── Type Guards ─────────────────────────────────────────────────────────────

const AGENT_SESSION_TYPES: ReadonlySet<string> = new Set([
  'session.created',
  'session.completed',
  'session.failed',
  'session.cancelled',
]);

const AGENT_MESSAGE_TYPES: ReadonlySet<string> = new Set([
  'message.created',
  'stream.chunk',
  'stream.end',
  'stream.error',
]);

export function isAgentSessionEvent(e: unknown): e is AgentSessionPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['sessionId'] === 'string' &&
    typeof obj['userId'] === 'string' &&
    typeof obj['type'] === 'string' &&
    AGENT_SESSION_TYPES.has(obj['type'])
  );
}

export function isAgentMessageEvent(e: unknown): e is AgentMessagePayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['sessionId'] === 'string' &&
    typeof obj['type'] === 'string' &&
    AGENT_MESSAGE_TYPES.has(obj['type'])
  );
}

export function isAnnotationEvent(e: unknown): e is AnnotationPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['annotationId'] === 'string' &&
    typeof obj['assetId'] === 'string'
  );
}

export function isContentEvent(e: unknown): e is ContentPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return typeof obj['contentItemId'] === 'string';
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

export function isTranscriptionEvent(e: unknown): e is TranscriptionPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['assetId'] === 'string' &&
    (obj['type'] === 'transcription.completed' ||
      obj['type'] === 'transcription.failed')
  );
}

export function isKnowledgeConceptEvent(
  e: unknown,
): e is KnowledgeConceptPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['assetId'] === 'string' &&
    Array.isArray(obj['concepts']) &&
    (obj['type'] === 'knowledge.concepts.extracted' ||
      obj['type'] === 'knowledge.concepts.persisted')
  );
}

// ─── Social Follow Events (F-035 Social Following System) ────────────────────

export interface UserFollowedPayload {
  readonly followerId: string;
  readonly followingId: string;
  readonly tenantId: string;
  readonly timestamp: string; // ISO 8601
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

// ─── Submission Events (F-005 Plagiarism Detection) ──────────────────────────

export interface SubmissionCreatedPayload {
  readonly submissionId: string;
  readonly tenantId: string;
  readonly courseId: string;
  readonly userId: string;
  readonly timestamp: string; // ISO 8601
}

export function isSubmissionCreatedEvent(e: unknown): e is SubmissionCreatedPayload {
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

export const NatsSubjects = {
  POLL_VOTED: 'EDUSPHERE.poll.voted',
  COURSE_ENROLLED: 'EDUSPHERE.course.enrolled',
  BADGE_ISSUED: 'EDUSPHERE.badge.issued',
  BADGE_REVOKED: 'EDUSPHERE.badge.revoked',
} as const;

// ─── Course Enrolled Events (F-031 Instructor Marketplace) ───────────────────

export interface CourseEnrolledPayload {
  readonly courseId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly purchaseId: string;
  readonly timestamp: string; // ISO 8601
}

export function isCourseEnrolledEvent(e: unknown): e is CourseEnrolledPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['courseId'] === 'string' &&
    typeof obj['userId'] === 'string' &&
    typeof obj['purchaseId'] === 'string'
  );
}

// ─── Course Completion Events (F-027 CPD/CE Credit Tracking) ─────────────────

export interface CourseCompletedPayload {
  readonly courseId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly completionDate: string; // ISO 8601
  readonly certificateId?: string;
  readonly courseTitle?: string;
  readonly courseCategory?: string;
  readonly estimatedHours?: number;
}

export function isCourseCompletedEvent(e: unknown): e is CourseCompletedPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['courseId'] === 'string' &&
    typeof obj['userId'] === 'string' &&
    typeof obj['tenantId'] === 'string' &&
    typeof obj['completionDate'] === 'string'
  );
}

// ─── OpenBadge 3.0 Events (F-025 Micro-Credentials) ──────────────────────────

export interface BadgeIssuedPayload {
  readonly assertionId: string;
  readonly badgeDefinitionId: string;
  readonly recipientId: string;
  readonly tenantId: string;
  readonly badgeName: string;
  readonly verifyUrl: string;
  readonly timestamp: string; // ISO 8601
}

export interface BadgeRevokedPayload {
  readonly assertionId: string;
  readonly tenantId: string;
  readonly reason: string;
  readonly timestamp: string; // ISO 8601
}

export function isBadgeIssuedEvent(e: unknown): e is BadgeIssuedPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['assertionId'] === 'string' &&
    typeof obj['recipientId'] === 'string' &&
    typeof obj['tenantId'] === 'string' &&
    typeof obj['badgeName'] === 'string'
  );
}

export function isBadgeRevokedEvent(e: unknown): e is BadgeRevokedPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['assertionId'] === 'string' &&
    typeof obj['tenantId'] === 'string' &&
    typeof obj['reason'] === 'string'
  );
}
