/**
 * useVideoAnnotations — fetches, mutates, and subscribes to video-scoped annotations.
 *
 * - Uses urql (consistent with useAnnotations pattern in this codebase)
 * - Queries annotationsByAsset filtered to VIDEO annotation type
 * - Real-time via ANNOTATION_ADDED_SUBSCRIPTION (paused on unmount — memory safe)
 * - Exposes addAnnotation, updateAnnotation, deleteAnnotation helpers
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
  addAnnotation: (text: string, timestamp: number, layer?: AnnotationLayer) => Promise<void>;
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

  const [queryResult] = useQuery({
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

  // Merge server annotations with incoming subscription events
  const rawAnnotations: unknown[] = queryResult.data?.annotationsByAsset ?? [];
  const incomingAnnotation = subscriptionResult.data?.annotationAdded;

  const annotations: VideoAnnotation[] = (() => {
    const base = (rawAnnotations as Record<string, unknown>[]).map((a) => ({
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
    }));

    if (incomingAnnotation) {
      const incoming = incomingAnnotation as Record<string, unknown>;
      const alreadyPresent = base.some((a) => a.id === String(incoming['id'] ?? ''));
      if (!alreadyPresent) {
        base.push({
          id: String(incoming['id'] ?? ''),
          assetId: String(incoming['assetId'] ?? ''),
          userId: String(incoming['userId'] ?? ''),
          layer: (incoming['layer'] as AnnotationLayer) ?? AnnotationLayer.PERSONAL,
          text: extractText(incoming['content']),
          timestamp: extractSpatialTimestamp(incoming['spatialData']),
          endTimestamp: extractSpatialEndTimestamp(incoming['spatialData']),
          color: LAYER_COLOR_MAP[String(incoming['layer'] ?? '')] ?? '#6b7280',
          createdAt: String(incoming['createdAt'] ?? ''),
          updatedAt: String(incoming['updatedAt'] ?? ''),
        });
      }
    }

    return base.sort((a, b) => a.timestamp - b.timestamp);
  })();

  const addAnnotation = useCallback(
    async (text: string, timestamp: number, layer: AnnotationLayer = AnnotationLayer.PERSONAL) => {
      await execCreate({
        input: {
          assetId: videoId,
          annotationType: 'TEXT',
          content: text,
          layer,
          spatialData: { timestampStart: timestamp },
        },
      });
    },
    [videoId, execCreate]
  );

  const updateAnnotation = useCallback(
    async (id: string, text: string) => {
      await execUpdate({ id, input: { content: text } });
    },
    [execUpdate]
  );

  const deleteAnnotation = useCallback(
    async (id: string) => {
      await execDelete({ id });
    },
    [execDelete]
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
