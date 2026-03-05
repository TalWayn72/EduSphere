/**
 * useAnnotations — loads, normalises, and manages annotation state.
 *
 * - Maps GraphQL response fields to the internal Annotation type
 * - Uses a persistent localAnnotations state for immediate UI feedback on add/reply
 *   (replaces the old useOptimistic+useTransition approach which caused notes to
 *   disappear after the transition ended when urql did not auto-refetch)
 * - After every successful mutation, forces a refetch so the server list is fresh
 * - Falls back to mock data when the query errors OR when contentId is not a UUID
 *   (offline / demo-mode, e.g. slug "content-1")
 * - On mutation failure, removes the locally-added annotation and logs the error
 * - Wires ANNOTATION_ADDED_SUBSCRIPTION for real-time incoming annotations
 *
 * Schema notes:
 *   content: JSON scalar — may be a plain string or { text: string }.
 *   spatialData: JSON — holds { timestampStart?: number, ... }.
 *   Replies are modelled as sibling annotations with parentId set.
 *   Multi-layer filtering is applied client-side (API supports single layer).
 */
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useSubscription } from 'urql';
import { Annotation, AnnotationLayer } from '@/types/annotations';
import {
  ANNOTATIONS_QUERY,
  REPLY_TO_ANNOTATION_MUTATION,
  PROMOTE_ANNOTATION_MUTATION,
} from '@/lib/graphql/annotation.queries';
import {
  CREATE_ANNOTATION_MUTATION,
  ANNOTATION_ADDED_SUBSCRIPTION,
} from '@/lib/graphql/annotation.mutations';
import { CREATE_REVIEW_CARD_MUTATION } from '@/lib/graphql/srs.queries';
import {
  getThreadedAnnotations,
  filterAnnotationsByLayers,
} from '@/lib/mock-annotations';
import { formatTime } from '@/pages/content-viewer.utils';
import type {
  AnnotationsQuery,
  AnnotationsQueryVariables,
  AnnotationAddedSubscription,
  AnnotationAddedSubscriptionVariables,
} from '@edusphere/graphql-types';

// ── GraphQL response types (derived from generated types) ───────────────────

/** Shape of a single annotation returned by the Annotations query. */
type GqlAnnotation = AnnotationsQuery['annotations'][number];

/**
 * Minimum fields required by normaliseAnnotation — covers both query items
 * (which have parentId) and subscription events (which do not).
 */
type GqlAnnotationInput =
  | GqlAnnotation
  | AnnotationAddedSubscription['annotationAdded'];

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
  gql: GqlAnnotationInput,
  contentId: string
): Annotation {
  const text = extractContentText(gql.content);
  const timestampStart = extractTimestamp(gql.spatialData);

  const localLayer = gql.layer as unknown as AnnotationLayer;

  return {
    id: gql.id,
    content: text,
    layer: localLayer,
    userId: gql.userId,
    userName: 'User', // user displayName resolved via core subgraph (not fetched here)
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

// ── UUID validation ─────────────────────────────────────────────────────────

/** Returns true only for canonical UUID v4 strings (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(value: string): boolean {
  return UUID_RE.test(value);
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface UseAnnotationsReturn {
  annotations: Annotation[];
  fetching: boolean;
  isPending: boolean;
  error: string | null;
  /** Force a fresh network fetch of the annotations list. */
  refetch: () => void;
  addAnnotation: (
    content: string,
    layer: AnnotationLayer,
    timestamp: number
  ) => void;
  addReply: (
    parentId: string,
    content: string,
    layer: AnnotationLayer,
    timestamp: number
  ) => void;
  /** Create an SRS flashcard from an annotation's text content. */
  createFlashcard: (annotationId: string, content: string) => Promise<boolean>;
  /** Promote annotation to INSTRUCTOR layer (instructor role required). */
  promoteAnnotation: (annotationId: string) => Promise<boolean>;
}

export function useAnnotations(
  contentId: string,
  activeLayers: AnnotationLayer[]
): UseAnnotationsReturn {
  // Only query when contentId is a valid UUID — slugs (e.g. "content-1") would
  // cause a PostgreSQL type-mismatch error on the uuid asset_id column.
  const validAssetId = !!contentId && isUUID(contentId);

  // Fetch all annotations for this asset; multi-layer filtering is client-side.
  const [result, executeQuery] = useQuery<
    AnnotationsQuery,
    AnnotationsQueryVariables
  >({
    query: ANNOTATIONS_QUERY,
    variables: { assetId: contentId },
    pause: !validAssetId,
  });

  // useSubscription<Data, Result, Variables>: Variables is the 3rd param.
  const [subscriptionResult] = useSubscription<
    AnnotationAddedSubscription,
    AnnotationAddedSubscription,
    AnnotationAddedSubscriptionVariables
  >({
    query: ANNOTATION_ADDED_SUBSCRIPTION,
    variables: { assetId: contentId },
    pause: !validAssetId,
  });

  const [, createAnnotation] = useMutation(CREATE_ANNOTATION_MUTATION);
  const [, replyToAnnotation] = useMutation(REPLY_TO_ANNOTATION_MUTATION);
  const [, createReviewCard] = useMutation(CREATE_REVIEW_CARD_MUTATION);
  const [, promoteAnnotationMutation] = useMutation(PROMOTE_ANNOTATION_MUTATION);

  // Tracks whether a save mutation is in-flight.
  const [isPending, setIsPending] = useState(false);

  // Local annotations: optimistic adds that persist across re-renders until
  // the server confirms them (or they fail). This replaces useOptimistic which
  // reverted state once the transition ended if urql hadn't refetched yet.
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>([]);

  const hasError = !!result.error && !result.data;

  // Server annotations — fall back to mock data when:
  //   a) contentId is not a UUID (offline / demo mode), OR
  //   b) the query returned an error
  const serverAnnotations: Annotation[] =
    !validAssetId || hasError
      ? getThreadedAnnotations()
      : (result.data?.annotations ?? []).map((a) =>
          normaliseAnnotation(a, contentId)
        );

  // Remove local annotations whose IDs are now present in the server list
  // (they've been confirmed and the refetch returned them).
  const serverIds = new Set(serverAnnotations.map((a) => a.id));
  useEffect(() => {
    setLocalAnnotations((prev) => prev.filter((a) => !serverIds.has(a.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.data?.annotations]);

  // Wire subscription: merge incoming annotations into local list.
  useEffect(() => {
    const incoming = subscriptionResult.data?.annotationAdded;
    if (!incoming) return;

    const newAnn = normaliseAnnotation(incoming, contentId);
    setLocalAnnotations((prev) => {
      if (prev.some((a) => a.id === newAnn.id) || serverIds.has(newAnn.id))
        return prev;
      return [newAnn, ...prev];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionResult.data, contentId]);

  // Merge local + server, deduplicating by ID (local-first so optimistic items
  // are at the top, superseded once the server list includes them).
  const merged = [
    ...localAnnotations.filter((a) => !serverIds.has(a.id)),
    ...serverAnnotations,
  ];

  const visibleAnnotations = filterAnnotationsByLayers(
    merged.filter((a, idx, arr) => arr.findIndex((x) => x.id === a.id) === idx),
    activeLayers
  );

  const refetch = useCallback(() => {
    if (validAssetId) {
      executeQuery({ requestPolicy: 'network-only' });
    }
  }, [validAssetId, executeQuery]);

  const addAnnotation = useCallback(
    (content: string, layer: AnnotationLayer, timestamp: number) => {
      const tempId = `local-${Date.now()}`;
      const tempAnnotation: Annotation = {
        id: tempId,
        content,
        layer,
        userId: 'current-user',
        userName: 'You',
        userRole: 'student',
        timestamp: formatTime(timestamp),
        contentId,
        contentTimestamp: timestamp || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replies: [],
      };

      // Add immediately — persists until server confirmation or failure.
      setLocalAnnotations((prev) => [tempAnnotation, ...prev]);

      if (!validAssetId) {
        // Offline / demo mode: keep in local state only, no backend mutation.
        return;
      }

      setIsPending(true);
      void createAnnotation({
        input: {
          assetId: contentId,
          annotationType: 'TEXT',
          content,
          layer,
          spatialData: timestamp > 0 ? { timestampStart: timestamp } : null,
        },
      }).then((response) => {
        setIsPending(false);
        if (response.error) {
          // Remove failed annotation and log so developers can diagnose.
          console.error(
            '[useAnnotations] Failed to save annotation:',
            response.error.message
          );
          setLocalAnnotations((prev) => prev.filter((a) => a.id !== tempId));
        } else {
          // Remove the local placeholder; the refetch will deliver the real one.
          setLocalAnnotations((prev) => prev.filter((a) => a.id !== tempId));
          executeQuery({ requestPolicy: 'network-only' });
        }
      });
    },
    [contentId, validAssetId, createAnnotation, executeQuery]
  );

  const addReply = useCallback(
    (
      parentId: string,
      content: string,
      layer: AnnotationLayer,
      timestamp: number
    ) => {
      const tempId = `local-reply-${Date.now()}`;
      const tempReply: Annotation = {
        id: tempId,
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

      setLocalAnnotations((prev) => [...prev, tempReply]);

      if (!validAssetId) return;

      void replyToAnnotation({ annotationId: parentId, content }).then(
        (response) => {
          if (response.error) {
            console.error(
              '[useAnnotations] Failed to save reply:',
              response.error.message
            );
            setLocalAnnotations((prev) => prev.filter((a) => a.id !== tempId));
          } else {
            setLocalAnnotations((prev) => prev.filter((a) => a.id !== tempId));
            executeQuery({ requestPolicy: 'network-only' });
          }
        }
      );
    },
    [contentId, validAssetId, replyToAnnotation, executeQuery]
  );

  const createFlashcard = useCallback(
    async (annotationId: string, content: string): Promise<boolean> => {
      const conceptName = content.slice(0, 200).trim();
      if (!conceptName) return false;
      const response = await createReviewCard({ conceptName });
      if (response.error) {
        console.error(
          `[useAnnotations] Failed to create flashcard for annotation ${annotationId}:`,
          response.error.message
        );
        return false;
      }
      return true;
    },
    [createReviewCard]
  );

  const promoteAnnotation = useCallback(
    async (annotationId: string): Promise<boolean> => {
      const response = await promoteAnnotationMutation({ id: annotationId });
      if (response.error) {
        console.error(
          `[useAnnotations] Failed to promote annotation ${annotationId}:`,
          response.error.message
        );
        return false;
      }
      executeQuery({ requestPolicy: 'network-only' });
      return true;
    },
    [promoteAnnotationMutation, executeQuery]
  );

  return {
    annotations: visibleAnnotations,
    fetching: result.fetching,
    isPending,
    error: hasError
      ? (result.error?.message ?? 'Failed to load annotations')
      : null,
    refetch,
    addAnnotation,
    addReply,
    createFlashcard,
    promoteAnnotation,
  };
}
