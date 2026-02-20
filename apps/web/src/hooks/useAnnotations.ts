/**
 * useAnnotations — loads, normalises, and manages annotation state.
 *
 * - Maps GraphQL response fields to the internal Annotation type
 * - Uses React 19 useOptimistic for immediate UI feedback on add/reply
 * - Uses useTransition to keep the UI responsive during mutations
 * - Wires ANNOTATION_ADDED_SUBSCRIPTION for real-time incoming annotations
 * - Falls back to mock data when the query errors
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

interface GqlAnnotationUser {
  id: string;
  displayName: string;
}

interface GqlAnnotationReply {
  id: string;
  content: string;
  userId: string;
  user?: GqlAnnotationUser | null;
  createdAt: string;
}

interface GqlAnnotation {
  id: string;
  layer: AnnotationLayer;
  content: string;
  timestampStart?: number | null;
  userId: string;
  user?: GqlAnnotationUser | null;
  replies?: GqlAnnotationReply[] | null;
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

// ── Normaliser ──────────────────────────────────────────────────────────────

function normaliseAnnotation(
  gql: GqlAnnotation,
  contentId: string
): Annotation {
  return {
    id: gql.id,
    content: gql.content,
    layer: gql.layer,
    userId: gql.userId,
    userName: gql.user?.displayName ?? 'Unknown',
    userRole: gql.layer === AnnotationLayer.AI_GENERATED ? 'ai'
      : gql.layer === AnnotationLayer.INSTRUCTOR ? 'instructor'
      : 'student',
    timestamp: formatTime(gql.timestampStart ?? 0),
    contentId,
    contentTimestamp: gql.timestampStart ?? undefined,
    createdAt: gql.createdAt,
    updatedAt: gql.updatedAt,
    replies: (gql.replies ?? []).map((r) => ({
      id: r.id,
      content: r.content,
      layer: gql.layer,
      userId: r.userId,
      userName: r.user?.displayName ?? 'Unknown',
      userRole: 'student' as const,
      timestamp: formatTime(0),
      contentId,
      createdAt: r.createdAt,
      updatedAt: r.createdAt,
    })),
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
  const [result] = useQuery<AnnotationsQueryResult>({
    query: ANNOTATIONS_QUERY,
    variables: { assetId: contentId, layers: activeLayers },
  });

  const [subscriptionResult] = useSubscription<AnnotationAddedSubscriptionResult>({
    query: ANNOTATION_ADDED_SUBSCRIPTION,
    variables: { assetId: contentId },
    pause: !contentId,
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
  // React automatically reverts optimistic state if the transition throws.
  const [optimisticAnnotations, dispatchOptimistic] = useOptimistic<
    Annotation[],
    OptimisticAction
  >(serverAnnotations, buildOptimisticList);

  const [isPending, startTransition] = useTransition();

  // When the subscription delivers a new annotation, merge it into the server
  // list indirectly by letting the urql cache update trigger a re-render.
  // We still need to handle the case where the subscription fires before the
  // next polling round — so we use dispatchOptimistic with 'add' action here.
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

  // Deduplicate: optimistic list may temporarily include items already
  // returned by the server (subscription -> server query race).
  const serverIds = new Set(serverAnnotations.map((a) => a.id));
  const visibleAnnotations = filterAnnotationsByLayers(
    optimisticAnnotations.filter((a, idx, arr) => {
      // Keep server items always; keep local-* items only if not yet in server
      if (!a.id.startsWith('local-')) return true;
      const isSuperseded = serverIds.has(a.id);
      // Deduplicate optimistic entries by id within the optimistic list itself
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
            content,
            layer,
            timestampStart: timestamp,
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
