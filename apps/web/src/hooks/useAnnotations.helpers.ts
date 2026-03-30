/**
 * useAnnotations helpers — content extraction, normalisation, UUID validation.
 */
import { Annotation, AnnotationLayer } from '@/types/annotations';
import { formatTime } from '@/pages/content-viewer.utils';
import type {
  AnnotationsQuery,
  AnnotationAddedSubscription,
} from '@edusphere/graphql-types';

// ── GraphQL response types (derived from generated types) ───────────────────

/** Shape of a single annotation returned by the Annotations query. */
export type GqlAnnotation = AnnotationsQuery['annotations'][number];

/**
 * Minimum fields required by normaliseAnnotation — covers both query items
 * (which have parentId) and subscription events (which do not).
 */
export type GqlAnnotationInput =
  | GqlAnnotation
  | AnnotationAddedSubscription['annotationAdded'];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract plain text from a JSON content scalar. */
export function extractContentText(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj['text'] === 'string') return obj['text'];
  }
  return String(raw ?? '');
}

/** Extract timestampStart (seconds) from a JSON spatialData scalar. */
export function extractTimestamp(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0;
  const obj = raw as Record<string, unknown>;
  return typeof obj['timestampStart'] === 'number' ? obj['timestampStart'] : 0;
}

// ── UUID validation ─────────────────────────────────────────────────────────

/** Returns true only for canonical UUID v4 strings. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUUID(value: string): boolean {
  return UUID_RE.test(value);
}

// ── Normaliser ──────────────────────────────────────────────────────────────

export function normaliseAnnotation(
  gql: GqlAnnotationInput,
  contentId: string
): Annotation {
  const text = extractContentText(gql.content);
  const timestampStart = extractTimestamp(gql.spatialData);

  const localLayer = (gql.layer as string) as AnnotationLayer;

  return {
    id: gql.id,
    content: text,
    layer: localLayer,
    userId: gql.userId,
    userName: 'User',
    userRole:
      localLayer === AnnotationLayer.AI_GENERATED
        ? 'ai'
        : localLayer === AnnotationLayer.INSTRUCTOR
          ? 'instructor'
          : 'student',
    timestamp: formatTime(timestampStart),
    contentId,
    contentTimestamp: timestampStart || undefined,
    parentId: ('parentId' in gql ? gql.parentId : undefined) ?? undefined,
    createdAt: gql.createdAt,
    updatedAt: gql.updatedAt,
    replies: [],
  };
}
