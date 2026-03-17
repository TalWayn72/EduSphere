/**
 * Knowledge Graph Events
 *
 * Covers: concept extraction, concept persistence
 */

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

// ─── Type Guard ──────────────────────────────────────────────────────────────

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
