/**
 * useAnnotations — loads, normalises, and manages annotation state.
 *
 * - Maps GraphQL response fields to the internal Annotation type
 * - Uses a persistent localAnnotations state for immediate UI feedback on add/reply
 * - After every successful mutation, forces a refetch so the server list is fresh
 * - Falls back to mock data when the query errors OR when contentId is not a UUID
 * - Wires ANNOTATION_ADDED_SUBSCRIPTION for real-time incoming annotations
 *
 * Schema notes:
 *   content: JSON scalar — may be a plain string or { text: string }.
 *   spatialData: JSON — holds { timestampStart?: number, ... }.
 *   Replies are modelled as sibling annotations with parentId set.
 *   Multi-layer filtering is applied client-side (API supports single layer).
 */
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useSubscription } from 'urql';
import { Annotation, AnnotationLayer } from '@/types/annotations';
import { ANNOTATIONS_QUERY } from '@/lib/graphql/annotation.queries';
import { ANNOTATION_ADDED_SUBSCRIPTION } from '@/lib/graphql/annotation.mutations';
import {
  getThreadedAnnotations,
  filterAnnotationsByLayers,
} from '@/lib/mock-annotations';
import type {
  AnnotationsQuery,
  AnnotationsQueryVariables,
  AnnotationAddedSubscription,
  AnnotationAddedSubscriptionVariables,
} from '@edusphere/graphql-types';
import { isUUID, normaliseAnnotation } from './useAnnotations.helpers';
import { useAnnotationMutations } from './useAnnotationMutations';

export interface UseAnnotationsReturn {
  annotations: Annotation[];
  fetching: boolean;
  isPending: boolean;
  error: string | null;
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
  createFlashcard: (annotationId: string, content: string) => Promise<boolean>;
  promoteAnnotation: (annotationId: string) => Promise<boolean>;
}

export function useAnnotations(
  contentId: string,
  activeLayers: AnnotationLayer[]
): UseAnnotationsReturn {
  const validAssetId = !!contentId && isUUID(contentId);

  const [result, executeQuery] = useQuery<
    AnnotationsQuery,
    AnnotationsQueryVariables
  >({
    query: ANNOTATIONS_QUERY,
    variables: { assetId: contentId },
    pause: !validAssetId,
  });

  const [subscriptionResult] = useSubscription<
    AnnotationAddedSubscription,
    AnnotationAddedSubscription,
    AnnotationAddedSubscriptionVariables
  >({
    query: ANNOTATION_ADDED_SUBSCRIPTION,
    variables: { assetId: contentId },
    pause: !validAssetId,
  });

  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>([]);

  const hasError = !!result.error && !result.data;

  const serverAnnotations: Annotation[] =
    !validAssetId || hasError
      ? getThreadedAnnotations()
      : (result.data?.annotations ?? []).map((a) =>
          normaliseAnnotation(a, contentId)
        );

  const serverIds = new Set(serverAnnotations.map((a) => a.id));

  useEffect(() => {
    setLocalAnnotations((prev) => prev.filter((a) => !serverIds.has(a.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.data?.annotations]);

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

  const mutations = useAnnotationMutations({
    contentId,
    validAssetId,
    setLocalAnnotations,
    executeQuery: executeQuery as unknown as (opts: {
      requestPolicy: string;
    }) => void,
  });

  return {
    annotations: visibleAnnotations,
    fetching: result.fetching,
    isPending: mutations.isPending,
    error: hasError
      ? (result.error?.message ?? 'Failed to load annotations')
      : null,
    refetch,
    addAnnotation: mutations.addAnnotation,
    addReply: mutations.addReply,
    createFlashcard: mutations.createFlashcard,
    promoteAnnotation: mutations.promoteAnnotation,
  };
}
