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
  | GatewayPubSubPayload;

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
