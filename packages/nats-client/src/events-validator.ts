import type {
  AgentSessionPayload,
  AgentMessagePayload,
  AnnotationPayload,
  ContentPayload,
} from './events.js';

/**
 * Runtime event validation for NATS messages.
 *
 * All NATS subscribers MUST call the appropriate validator before
 * processing a message. Malformed events throw EventValidationError
 * rather than passing corrupt data to business logic.
 */
export class EventValidationError extends Error {
  public readonly channel: string;
  public readonly payload: unknown;
  public readonly violations: string[];

  constructor(channel: string, payload: unknown, violations: string[]) {
    super(
      `Invalid NATS event on channel '${channel}': ${violations.join('; ')}`,
    );
    this.name = 'EventValidationError';
    this.channel = channel;
    this.payload = payload;
    this.violations = violations;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface FieldCheck {
  field: string;
  check: () => boolean;
  message: string;
}

function collectViolations(
  _obj: Record<string, unknown>,
  checks: FieldCheck[],
): string[] {
  return checks.filter(({ check }) => !check()).map(({ message }) => message);
}

function assertObject(
  channel: string,
  payload: unknown,
): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') {
    throw new EventValidationError(channel, payload, [
      'payload must be a non-null object',
    ]);
  }
  return payload as Record<string, unknown>;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const AGENT_SESSION_TYPES = [
  'session.created',
  'session.completed',
  'session.failed',
  'session.cancelled',
] as const;

const AGENT_MESSAGE_TYPES = [
  'message.created',
  'stream.chunk',
  'stream.end',
  'stream.error',
] as const;

const ANNOTATION_TYPES = [
  'annotation.created',
  'annotation.updated',
  'annotation.deleted',
  'annotation.resolved',
] as const;

const CONTENT_TYPES = [
  'content.created',
  'content.updated',
  'content.deleted',
  'content.published',
  'content.transcription.completed',
] as const;

export function validateAgentSessionEvent(
  payload: unknown,
): AgentSessionPayload {
  const obj = assertObject('agent.session.*', payload);
  const violations = collectViolations(obj, [
    {
      field: 'sessionId',
      check: () =>
        typeof obj['sessionId'] === 'string' && obj['sessionId'].length > 0,
      message: 'sessionId must be a non-empty string',
    },
    {
      field: 'userId',
      check: () =>
        typeof obj['userId'] === 'string' && obj['userId'].length > 0,
      message: 'userId must be a non-empty string',
    },
    {
      field: 'type',
      check: () =>
        typeof obj['type'] === 'string' &&
        (AGENT_SESSION_TYPES as readonly string[]).includes(obj['type']),
      message: `type must be one of: ${AGENT_SESSION_TYPES.join(', ')}`,
    },
    {
      field: 'timestamp',
      check: () =>
        typeof obj['timestamp'] === 'string' &&
        !isNaN(Date.parse(obj['timestamp'])),
      message: 'timestamp must be a valid ISO 8601 date string',
    },
  ]);

  if (violations.length > 0) {
    throw new EventValidationError('agent.session.*', payload, violations);
  }

  return payload as AgentSessionPayload;
}

export function validateAgentMessageEvent(
  payload: unknown,
): AgentMessagePayload {
  const obj = assertObject('agent.message.*', payload);
  const violations = collectViolations(obj, [
    {
      field: 'sessionId',
      check: () =>
        typeof obj['sessionId'] === 'string' && obj['sessionId'].length > 0,
      message: 'sessionId must be a non-empty string',
    },
    {
      field: 'userId',
      check: () =>
        typeof obj['userId'] === 'string' && obj['userId'].length > 0,
      message: 'userId must be a non-empty string',
    },
    {
      field: 'type',
      check: () =>
        typeof obj['type'] === 'string' &&
        (AGENT_MESSAGE_TYPES as readonly string[]).includes(obj['type']),
      message: `type must be one of: ${AGENT_MESSAGE_TYPES.join(', ')}`,
    },
  ]);

  if (violations.length > 0) {
    throw new EventValidationError('agent.message.*', payload, violations);
  }

  return payload as AgentMessagePayload;
}

export function validateAnnotationEvent(payload: unknown): AnnotationPayload {
  const obj = assertObject('annotation.*', payload);
  const violations = collectViolations(obj, [
    {
      field: 'annotationId',
      check: () =>
        typeof obj['annotationId'] === 'string' &&
        obj['annotationId'].length > 0,
      message: 'annotationId must be a non-empty string',
    },
    {
      field: 'assetId',
      check: () =>
        typeof obj['assetId'] === 'string' && obj['assetId'].length > 0,
      message: 'assetId must be a non-empty string',
    },
    {
      field: 'userId',
      check: () =>
        typeof obj['userId'] === 'string' && obj['userId'].length > 0,
      message: 'userId must be a non-empty string',
    },
    {
      field: 'tenantId',
      check: () =>
        typeof obj['tenantId'] === 'string' && obj['tenantId'].length > 0,
      message: 'tenantId must be a non-empty string',
    },
    {
      field: 'type',
      check: () =>
        typeof obj['type'] === 'string' &&
        (ANNOTATION_TYPES as readonly string[]).includes(obj['type']),
      message: `type must be one of: ${ANNOTATION_TYPES.join(', ')}`,
    },
  ]);

  if (violations.length > 0) {
    throw new EventValidationError('annotation.*', payload, violations);
  }

  return payload as AnnotationPayload;
}

export function validateContentEvent(payload: unknown): ContentPayload {
  const obj = assertObject('content.*', payload);
  const violations = collectViolations(obj, [
    {
      field: 'contentItemId',
      check: () =>
        typeof obj['contentItemId'] === 'string' &&
        obj['contentItemId'].length > 0,
      message: 'contentItemId must be a non-empty string',
    },
    {
      field: 'tenantId',
      check: () =>
        typeof obj['tenantId'] === 'string' && obj['tenantId'].length > 0,
      message: 'tenantId must be a non-empty string',
    },
    {
      field: 'type',
      check: () =>
        typeof obj['type'] === 'string' &&
        (CONTENT_TYPES as readonly string[]).includes(obj['type']),
      message: 'type must be a valid ContentEventType',
    },
  ]);

  if (violations.length > 0) {
    throw new EventValidationError('content.*', payload, violations);
  }

  return payload as ContentPayload;
}
