/**
 * Knowledge Graph Events
 *
 * Covers: concept extraction, concept persistence, concept deletion
 */

export type KnowledgeConceptEventType =
  | 'knowledge.concepts.extracted'
  | 'knowledge.concepts.persisted'
  | 'knowledge.concept.deleted';

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

/** Payload published on `knowledge.concept.deleted` after a concept vertex
 *  and its associated embeddings have been removed. */
export interface KnowledgeConceptDeletedPayload {
  readonly type: 'knowledge.concept.deleted';
  readonly conceptId: string;
  readonly tenantId: string;
  readonly embeddingsDeleted: number;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isKnowledgeConceptEvent(
  e: unknown
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

export function isKnowledgeConceptDeletedEvent(
  e: unknown
): e is KnowledgeConceptDeletedPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    obj['type'] === 'knowledge.concept.deleted' &&
    typeof obj['conceptId'] === 'string' &&
    typeof obj['tenantId'] === 'string'
  );
}
