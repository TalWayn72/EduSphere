/**
 * Annotation Events
 *
 * Covers: annotation CRUD lifecycle, layer visibility
 */

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

// ─── Type Guard ──────────────────────────────────────────────────────────────

export function isAnnotationEvent(e: unknown): e is AnnotationPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['annotationId'] === 'string' &&
    typeof obj['assetId'] === 'string'
  );
}
