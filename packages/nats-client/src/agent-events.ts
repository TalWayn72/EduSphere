/**
 * Agent Session & Message Events
 *
 * Covers: agent session lifecycle, message streaming
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
