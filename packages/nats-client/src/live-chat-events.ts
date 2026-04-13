/**
 * Live Lesson Streaming Events — Chat, Reactions, Q&A & Instructor Actions
 *
 * Covers: in-session chat messages, pin/delete moderation, emoji reactions
 * (individual and aggregated bursts), Q&A lifecycle (asked/upvoted/answered/dismissed),
 * and instructor highlight/poll actions.
 *
 * Subject namespace: EDUSPHERE.live.chat.* | EDUSPHERE.live.reaction.*
 *                    EDUSPHERE.live.qa.* | EDUSPHERE.live.instructor.*
 */

// ─── Chat Events ─────────────────────────────────────────────────────────────

export interface LiveChatMessagePayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly messageId: string;
  readonly userId: string;
  readonly text: string;
  readonly timestamp: string; // ISO 8601
}

export interface LiveChatPinPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly messageId: string;
  readonly pinnedBy: string;
  readonly timestamp: string; // ISO 8601
}

export interface LiveChatDeletePayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly messageId: string;
  readonly deletedBy: string;
  readonly timestamp: string; // ISO 8601
}

// ─── Reaction Events ─────────────────────────────────────────────────────────

export interface LiveReactionPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly emoji: string;
  readonly timestamp: string; // ISO 8601
}

/** Aggregated reaction burst — emitted at most once per 2-second window per emoji */
export interface LiveReactionBurstPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly emoji: string;
  readonly count: number;
  readonly windowMs: number;
  readonly timestamp: string; // ISO 8601
}

// ─── Q&A Events ──────────────────────────────────────────────────────────────

export interface LiveQaAskedPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly questionId: string;
  readonly userId: string;
  readonly text: string;
  readonly timestamp: string; // ISO 8601
}

export interface LiveQaUpvotedPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly questionId: string;
  readonly userId: string;
  readonly upvotes: number;
  readonly timestamp: string; // ISO 8601
}

export interface LiveQaAnsweredPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly questionId: string;
  readonly answeredBy: string;
  readonly answerText?: string;
  readonly timestamp: string; // ISO 8601
}

export interface LiveQaDismissedPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly questionId: string;
  readonly dismissedBy: string;
  readonly timestamp: string; // ISO 8601
}

// ─── Instructor Action Events ─────────────────────────────────────────────────

export interface LiveInstructorHighlightPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly contentRef: string;
  readonly highlightText: string;
  readonly timestamp: string; // ISO 8601
}

export interface LiveInstructorPollPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly pollId: string;
  readonly question: string;
  readonly options: string[];
  readonly durationSeconds: number;
  readonly timestamp: string; // ISO 8601
}

// ─── Subject Constants ───────────────────────────────────────────────────────

export const LiveChatSubjects = {
  CHAT_MESSAGE: 'EDUSPHERE.live.chat.message',
  CHAT_PIN: 'EDUSPHERE.live.chat.pin',
  CHAT_DELETE: 'EDUSPHERE.live.chat.delete',
  REACTION: 'EDUSPHERE.live.reaction',
  REACTION_BURST: 'EDUSPHERE.live.reaction.burst',
  QA_ASKED: 'EDUSPHERE.live.qa.asked',
  QA_UPVOTED: 'EDUSPHERE.live.qa.upvoted',
  QA_ANSWERED: 'EDUSPHERE.live.qa.answered',
  QA_DISMISSED: 'EDUSPHERE.live.qa.dismissed',
  INSTRUCTOR_HIGHLIGHT: 'EDUSPHERE.live.instructor.highlight',
  INSTRUCTOR_POLL: 'EDUSPHERE.live.instructor.poll',
} as const;

// ─── Discriminated Union ─────────────────────────────────────────────────────

export type LiveChatEvent =
  | LiveChatMessagePayload
  | LiveChatPinPayload
  | LiveChatDeletePayload
  | LiveReactionPayload
  | LiveReactionBurstPayload
  | LiveQaAskedPayload
  | LiveQaUpvotedPayload
  | LiveQaAnsweredPayload
  | LiveQaDismissedPayload
  | LiveInstructorHighlightPayload
  | LiveInstructorPollPayload;

// ─── Type Guards ─────────────────────────────────────────────────────────────

function hasSessionAndTenant(
  e: unknown
): e is { sessionId: string; tenantId: string } {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['sessionId'] === 'string' && typeof obj['tenantId'] === 'string'
  );
}

export function isLiveChatMessageEvent(
  e: unknown
): e is LiveChatMessagePayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['messageId'] === 'string' && typeof obj['text'] === 'string'
  );
}

export function isLiveChatPinEvent(e: unknown): e is LiveChatPinPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['messageId'] === 'string' && typeof obj['pinnedBy'] === 'string'
  );
}

export function isLiveChatDeleteEvent(e: unknown): e is LiveChatDeletePayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['messageId'] === 'string' && typeof obj['deletedBy'] === 'string'
  );
}

export function isLiveReactionEvent(e: unknown): e is LiveReactionPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return typeof obj['emoji'] === 'string' && typeof obj['userId'] === 'string';
}

export function isLiveReactionBurstEvent(
  e: unknown
): e is LiveReactionBurstPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['emoji'] === 'string' &&
    typeof obj['count'] === 'number' &&
    typeof obj['windowMs'] === 'number'
  );
}

export function isLiveQaAskedEvent(e: unknown): e is LiveQaAskedPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['questionId'] === 'string' && typeof obj['text'] === 'string'
  );
}

export function isLiveQaUpvotedEvent(e: unknown): e is LiveQaUpvotedPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['questionId'] === 'string' && typeof obj['upvotes'] === 'number'
  );
}

export function isLiveQaAnsweredEvent(e: unknown): e is LiveQaAnsweredPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['questionId'] === 'string' &&
    typeof obj['answeredBy'] === 'string'
  );
}

export function isLiveQaDismissedEvent(
  e: unknown
): e is LiveQaDismissedPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['questionId'] === 'string' &&
    typeof obj['dismissedBy'] === 'string'
  );
}

export function isLiveInstructorHighlightEvent(
  e: unknown
): e is LiveInstructorHighlightPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['contentRef'] === 'string' &&
    typeof obj['highlightText'] === 'string'
  );
}

export function isLiveInstructorPollEvent(
  e: unknown
): e is LiveInstructorPollPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['pollId'] === 'string' &&
    typeof obj['question'] === 'string' &&
    Array.isArray(obj['options'])
  );
}
