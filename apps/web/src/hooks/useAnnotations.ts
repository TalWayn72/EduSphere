/**
 * useAnnotations — loads, normalises, and manages annotation state.
 *
 * - Maps GraphQL response fields to the internal Annotation type
 * - Uses React 19 useOptimistic for immediate UI feedback on add/reply
 * - Uses useTransition to keep the UI responsive during mutations
 * - Wires ANNOTATION_ADDED_SUBSCRIPTION for real-time incoming annotations
 * - Falls back to mock data when the query errors
 *
 * Schema notes:
 *   content: JSON scalar — may be a plain string or { text: string }.
 *   spatialData: JSON — holds { timestampStart?: number, ... }.
 *   Replies are modelled as sibling annotations with parentId set.
 *   Multi-layer filtering is applied client-side (API supports single layer).
 */
import { useOptimistic, useTransition, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useSubscription } from 'urql';
import { Annotation, AnnotationLayer } from '@/types/annotations';
import {
  ANNOTATIONS_QUERY,
  CREATE_ANNOTATION_MUTATION,
  REPLY_TO_ANNOTATION_MUTATION,
  ANNOTATION_ADDED_SUBSCRIPTION,
} from '@/lib/graphql/annotation.queries';
import {
  getThreadedAnnotations,
  filterAnnotationsByLayers,
} from '@/lib/mock-annotations';
import { formatTime } from '@/pages/content-viewer.utils';

// ── GraphQL response types ──────────────────────────────────────────────────

interface GqlAnnotation {
  id: string;
  layer: AnnotationLayer;
  annotationType: string;
  /** JSON scalar — plain string or { text: string } object */
  content: unknown;
  /** JSON scalar — { timestampStart?: number, ... } */
  spatialData?: unknown;
  parentId?: string | null;
  userId: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AnnotationsQueryResult {
  annotations?: GqlAnnotation[] | null;
}

interface AnnotationAddedSubscriptionResult {
  annotationAdded?: GqlAnnotation | null;
}

// ── Optimistic action types ─────────────────────────────────────────────────

type OptimisticAction =
  | { type: 'add'; annotation: Annotation }
  | { type: 'reply'; annotation: Annotation };

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract plain text from a JSON content scalar. */
function extractContentText(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj['text'] === 'string') return obj['text'];
  }
  return String(raw ?? '');
}

/** Extract timestampStart (seconds) from a JSON spatialData scalar. */
function extractTimestamp(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0;
  const obj = raw as Record<string, unknown>;
  return typeof obj['timestampStart'] === 'number' ? obj['timestampStart'] : 0;
}

// ── Normaliser ──────────────────────────────────────────────────────────────

function normaliseAnnotation(
  gql: GqlAnnotation,
  contentId: string
): Annotation {
  const text = extractContentText(gql.content);
  const timestampStart = extractTimestamp(gql.spatialData);

  return {
    id: gql.id,
    content: text,
    layer: gql.layer,
    userId: gql.userId,
    userName: 'User', // user displayName resolved via core subgraph (not fetched here)
    userRole:
      gql.layer === AnnotationLayer.AI_GENERATED
        ? 'ai'
        : gql.layer === AnnotationLayer.INSTRUCTOR
        ? 'instructor'
        : 'student',
    timestamp: formatTime(timestampStart),
    contentId,
    contentTimestamp: timestampStart || undefined,
    parentId: gql.parentId ?? undefined,
    createdAt: gql.createdAt,
    updatedAt: gql.updatedAt,
    replies: [], // siblings with matching parentId are threaded client-side
  };
}

function buildOptimisticList(
  state: Annotation[],
  action: OptimisticAction
): Annotation[] {
  if (action.type === 'add') {
    return [action.annotation, ...state];
  }
  // reply: append to end (subscription will deduplicate on next query)
  return [...state, action.annotation];
}

// ── UUID validation ─────────────────────────────────────────────────────────

/** Returns true only for canonical UUID v4 strings (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(value: string): boolean {
  return UUID_RE.test(value);
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface UseAnnotationsReturn {
  annotations: Annotation[];
  fetching: boolean;
  isPending: boolean;
  error: string | null;
  addAnnotation: (content: string, layer: AnnotationLayer, timestamp: number) => void;
  addReply: (parentId: string, content: string, layer: AnnotationLayer, timestamp: number) => void;
}

export function useAnnotations(
  contentId: string,
  activeLayers: AnnotationLayer[]
): UseAnnotationsReturn {
  // Only query when contentId is a valid UUID — slugs (e.g. "content-1") would
  // cause a PostgreSQL type-mismatch error on the uuid asset_id column.
  const validAssetId = !!contentId && isUUID(contentId);

  // Fetch all annotations for this asset; multi-layer filtering is client-side.
  const [result] = useQuery<AnnotationsQueryResult>({
    query: ANNOTATIONS_QUERY,
    variables: { assetId: contentId },
    pause: !validAssetId,
  });

  const [subscriptionResult] = useSubscription<AnnotationAddedSubscriptionResult>({
    query: ANNOTATION_ADDED_SUBSCRIPTION,
    variables: { assetId: contentId },
    pause: !validAssetId,
  });

  const [, createAnnotation] = useMutation(CREATE_ANNOTATION_MUTATION);
  const [, replyToAnnotation] = useMutation(REPLY_TO_ANNOTATION_MUTATION);

  const hasError = !!result.error && !result.data;

  const serverAnnotations: Annotation[] = hasError
    ? filterAnnotationsByLayers(getThreadedAnnotations(), activeLayers)
    : (result.data?.annotations ?? []).map((a) =>
        normaliseAnnotation(a, contentId)
      );

  // useOptimistic: base state is server list; reducer applies add/reply actions.
  const [optimisticAnnotations, dispatchOptimistic] = useOptimistic<
    Annotation[],
    OptimisticAction
  >(serverAnnotations, buildOptimisticList);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const incoming = subscriptionResult.data?.annotationAdded;
    if (!incoming) return;

    const alreadyInServer = serverAnnotations.some((a) => a.id === incoming.id);
    if (alreadyInServer) return;

    dispatchOptimistic({
      type: 'add',
      annotation: normaliseAnnotation(incoming, contentId),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionResult.data, contentId]);

  // Deduplicate optimistic list vs server list
  const serverIds = new Set(serverAnnotations.map((a) => a.id));
  const visibleAnnotations = filterAnnotationsByLayers(
    optimisticAnnotations.filter((a, idx, arr) => {
      if (!a.id.startsWith('local-')) return true;
      const isSuperseded = serverIds.has(a.id);
      return !isSuperseded && arr.findIndex((x) => x.id === a.id) === idx;
    }),
    activeLayers
  );

  const addAnnotation = useCallback(
    (content: string, layer: AnnotationLayer, timestamp: number) => {
      const tempAnnotation: Annotation = {
        id: `local-${Date.now()}`,
        content,
        layer,
        userId: 'current-user',
        userName: 'You',
        userRole: 'student',
        timestamp: formatTime(timestamp),
        contentId,
        contentTimestamp: timestamp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replies: [],
      };

      startTransition(async () => {
        dispatchOptimistic({ type: 'add', annotation: tempAnnotation });
        await createAnnotation({
          input: {
            assetId: contentId,
            annotationType: 'TEXT',
            content,
            layer,
            spatialData: timestamp > 0 ? { timestampStart: timestamp } : null,
          },
        });
      });
    },
    [contentId, createAnnotation, dispatchOptimistic]
  );

  const addReply = useCallback(
    (
      parentId: string,
      content: string,
      layer: AnnotationLayer,
      timestamp: number
    ) => {
      const tempReply: Annotation = {
        id: `local-reply-${Date.now()}`,
        content,
        layer,
        userId: 'current-user',
        userName: 'You',
        userRole: 'student',
        timestamp: formatTime(timestamp),
        contentId,
        parentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replies: [],
      };

      startTransition(async () => {
        dispatchOptimistic({ type: 'reply', annotation: tempReply });
        await replyToAnnotation({ annotationId: parentId, content });
      });
    },
    [contentId, replyToAnnotation, dispatchOptimistic]
  );

  return {
    annotations: visibleAnnotations,
    fetching: result.fetching,
    isPending,
    error: hasError ? (result.error?.message ?? 'Failed to load annotations') : null,
    addAnnotation,
    addReply,
  };
}
