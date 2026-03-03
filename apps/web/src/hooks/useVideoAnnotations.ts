/**
 * useVideoAnnotations — fetches, mutates, and subscribes to video-scoped annotations.
 *
 * - Uses urql (consistent with useAnnotations pattern in this codebase)
 * - Queries annotationsByAsset filtered to VIDEO annotation type
 * - Real-time via ANNOTATION_ADDED_SUBSCRIPTION (paused on unmount — memory safe)
 * - Exposes addAnnotation, updateAnnotation, deleteAnnotation helpers
 * - Optimistically adds new annotations to local state immediately; on mutation
 *   success triggers a refetch and removes the placeholder; on failure removes
 *   the placeholder and logs the error so annotations do not disappear silently.
 */
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useSubscription } from 'urql';
import {
  ANNOTATIONS_BY_ASSET_QUERY,
  CREATE_ANNOTATION_MUTATION,
  UPDATE_ANNOTATION_MUTATION,
  DELETE_ANNOTATION_MUTATION,
  ANNOTATION_ADDED_SUBSCRIPTION,
} from '@/lib/graphql/annotation.mutations';
import { AnnotationLayer } from '@/types/annotations';

// ── Types ────────────────────────────────────────────────────────────────────

export interface VideoAnnotation {
  id: string;
  assetId: string;
  userId: string;
  layer: AnnotationLayer;
  text: string;
  timestamp: number;
  endTimestamp?: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface UseVideoAnnotationsReturn {
  annotations: VideoAnnotation[];
  isLoading: boolean;
  error: string | null;
  addAnnotation: (
    text: string,
    timestamp: number,
    layer?: AnnotationLayer
  ) => Promise<void>;
  updateAnnotation: (id: string, text: string) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const LAYER_COLOR_MAP: Record<string, string> = {
  PERSONAL: '#7c3aed',
  SHARED: '#2563eb',
  INSTRUCTOR: '#16a34a',
  AI_GENERATED: '#d97706',
};

function extractSpatialTimestamp(spatialData: unknown): number {
  if (!spatialData || typeof spatialData !== 'object') return 0;
  const d = spatialData as Record<string, unknown>;
  return typeof d['timestampStart'] === 'number' ? d['timestampStart'] : 0;
}

function extractSpatialEndTimestamp(spatialData: unknown): number | undefined {
  if (!spatialData || typeof spatialData !== 'object') return undefined;
  const d = spatialData as Record<string, unknown>;
  return typeof d['timestampEnd'] === 'number' ? d['timestampEnd'] : undefined;
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const c = content as Record<string, unknown>;
    if (typeof c['text'] === 'string') return c['text'];
  }
  return String(content ?? '');
}

function rawToVideoAnnotation(a: Record<string, unknown>): VideoAnnotation {
  return {
    id: String(a['id'] ?? ''),
    assetId: String(a['assetId'] ?? ''),
    userId: String(a['userId'] ?? ''),
    layer: (a['layer'] as AnnotationLayer) ?? AnnotationLayer.PERSONAL,
    text: extractText(a['content']),
    timestamp: extractSpatialTimestamp(a['spatialData']),
    endTimestamp: extractSpatialEndTimestamp(a['spatialData']),
    color: LAYER_COLOR_MAP[String(a['layer'] ?? '')] ?? '#6b7280',
    createdAt: String(a['createdAt'] ?? ''),
    updatedAt: String(a['updatedAt'] ?? ''),
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useVideoAnnotations(
  videoId: string,
  _tenantId: string
): UseVideoAnnotationsReturn {
  // Memory-safe subscription: pause when component unmounts
  const [subscriptionPaused, setSubscriptionPaused] = useState(false);

  useEffect(() => {
    return () => {
      setSubscriptionPaused(true);
    };
  }, []);

  const [queryResult, executeQuery] = useQuery({
    query: ANNOTATIONS_BY_ASSET_QUERY,
    variables: { assetId: videoId },
    pause: !videoId,
  });

  const [subscriptionResult] = useSubscription({
    query: ANNOTATION_ADDED_SUBSCRIPTION,
    variables: { assetId: videoId },
    pause: subscriptionPaused || !videoId,
  });

  const [, execCreate] = useMutation(CREATE_ANNOTATION_MUTATION);
  const [, execUpdate] = useMutation(UPDATE_ANNOTATION_MUTATION);
  const [, execDelete] = useMutation(DELETE_ANNOTATION_MUTATION);

  // Local annotations: optimistic adds that persist until server confirms.
  const [localAnnotations, setLocalAnnotations] = useState<VideoAnnotation[]>(
    []
  );

  const serverAnnotations: VideoAnnotation[] = (
    (queryResult.data?.annotationsByAsset ?? []) as Record<string, unknown>[]
  ).map(rawToVideoAnnotation);

  // Clean up local annotations that are now confirmed server-side.
  const serverIds = new Set(serverAnnotations.map((a) => a.id));
  useEffect(() => {
    setLocalAnnotations((prev) => prev.filter((a) => !serverIds.has(a.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryResult.data?.annotationsByAsset]);

  // Merge incoming subscription event into local list.
  useEffect(() => {
    const incoming = subscriptionResult.data?.annotationAdded as
      | Record<string, unknown>
      | undefined;
    if (!incoming) return;
    const newAnn = rawToVideoAnnotation(incoming);
    setLocalAnnotations((prev) => {
      if (prev.some((a) => a.id === newAnn.id) || serverIds.has(newAnn.id))
        return prev;
      return [...prev, newAnn];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionResult.data]);

  // Merge server + local, deduplicate, sort by timestamp.
  const merged = [
    ...serverAnnotations,
    ...localAnnotations.filter((a) => !serverIds.has(a.id)),
  ];
  const annotations = merged
    .filter((a, idx, arr) => arr.findIndex((x) => x.id === a.id) === idx)
    .sort((a, b) => a.timestamp - b.timestamp);

  const addAnnotation = useCallback(
    async (
      text: string,
      timestamp: number,
      layer: AnnotationLayer = AnnotationLayer.PERSONAL
    ) => {
      const tempId = `local-video-${Date.now()}`;
      const tempAnn: VideoAnnotation = {
        id: tempId,
        assetId: videoId,
        userId: 'current-user',
        layer,
        text,
        timestamp,
        color: LAYER_COLOR_MAP[layer] ?? '#6b7280',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add immediately so the marker appears on the timeline right away.
      setLocalAnnotations((prev) => [...prev, tempAnn]);

      const response = await execCreate({
        input: {
          assetId: videoId,
          annotationType: 'TEXT',
          content: text,
          layer,
          spatialData: { timestampStart: timestamp },
        },
      });

      if (response.error) {
        console.error(
          '[useVideoAnnotations] Failed to save annotation:',
          response.error.message
        );
        setLocalAnnotations((prev) => prev.filter((a) => a.id !== tempId));
      } else {
        // Remove placeholder; refetch will deliver the canonical version.
        setLocalAnnotations((prev) => prev.filter((a) => a.id !== tempId));
        executeQuery({ requestPolicy: 'network-only' });
      }
    },
    [videoId, execCreate, executeQuery]
  );

  const updateAnnotation = useCallback(
    async (id: string, text: string) => {
      const response = await execUpdate({ id, input: { content: text } });
      if (response.error) {
        console.error(
          '[useVideoAnnotations] Failed to update annotation:',
          response.error.message
        );
        return;
      }
      executeQuery({ requestPolicy: 'network-only' });
    },
    [execUpdate, executeQuery]
  );

  const deleteAnnotation = useCallback(
    async (id: string) => {
      const response = await execDelete({ id });
      if (response.error) {
        console.error(
          '[useVideoAnnotations] Failed to delete annotation:',
          response.error.message
        );
        return;
      }
      setLocalAnnotations((prev) => prev.filter((a) => a.id !== id));
      executeQuery({ requestPolicy: 'network-only' });
    },
    [execDelete, executeQuery]
  );

  return {
    annotations,
    isLoading: queryResult.fetching,
    error: queryResult.error?.message ?? null,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
  };
}
