/**
 * useDocumentAnnotations — adapter hook for document (text-range) annotations.
 *
 * Delegates query + subscription to useAnnotations so there is only one urql
 * subscription per contentId.  Adds `addTextAnnotation` which writes spatialData
 * as { from, to } rather than the video-centric { timestampStart } shape that
 * useAnnotations.addAnnotation uses.
 *
 * spatialData shape for document annotations: { from: number; to: number }
 * spatialData shape for video/audio annotations: { timestampStart: number }
 */
import { useCallback, useMemo } from 'react';
import { useMutation } from 'urql';
import { useAnnotations } from '@/hooks/useAnnotations';
import { useUIStore } from '@/lib/store';
import { AnnotationLayer, type Annotation } from '@/types/annotations';
import { CREATE_ANNOTATION_MUTATION } from '@/lib/graphql/annotation.mutations';

// ── TextRangeAnnotation — minimal shape for AnnotationDecorationsPlugin ──────
// Defined here because AnnotationDecorationsPlugin does not exist yet.
// When the plugin is created this type should be imported from there instead.

export interface TextRangeAnnotation {
  id: string;
  layer: AnnotationLayer;
  textRange: { from: number; to: number };
}

// ── All layers (document annotations can belong to any layer) ────────────────

const ALL_LAYERS: AnnotationLayer[] = [
  AnnotationLayer.PERSONAL,
  AnnotationLayer.SHARED,
  AnnotationLayer.INSTRUCTOR,
  AnnotationLayer.AI_GENERATED,
];

// ── Input type for addTextAnnotation ─────────────────────────────────────────

export interface DocumentAnnotationInput {
  text: string;
  layer: AnnotationLayer;
  from: number;
  to: number;
}

// ── Type guards ───────────────────────────────────────────────────────────────

/** Returns true when ann has a valid textRange (either normalised or raw spatialData). */
function hasTextRange(
  ann: Annotation
): ann is Annotation & { textRange: { from: number; to: number } } {
  if (ann.textRange != null) return true;
  // Backwards-compatibility: spatialData may arrive un-normalised in the JSON field.
  const sd = (ann as unknown as Record<string, unknown>)['spatialData'] as
    | Record<string, unknown>
    | undefined;
  return (
    typeof sd?.['from'] === 'number' &&
    typeof sd?.['to'] === 'number' &&
    (sd['to'] as number) > (sd['from'] as number)
  );
}

function getTextRange(ann: Annotation): { from: number; to: number } {
  if (ann.textRange != null) return ann.textRange;
  const sd = (ann as unknown as Record<string, unknown>)[
    'spatialData'
  ] as Record<string, unknown>;
  return { from: sd['from'] as number, to: sd['to'] as number };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseDocumentAnnotationsReturn {
  /** Minimal shape consumed by AnnotationDecorationsPlugin. */
  textAnnotations: TextRangeAnnotation[];
  /** Full Annotation objects (with textRange) for CommentPanel, sorted by from. */
  allAnnotations: Annotation[];
  focusedAnnotationId: string | null;
  setFocusedAnnotationId: (id: string | null) => void;
  addTextAnnotation: (input: DocumentAnnotationInput) => Promise<void>;
  fetching: boolean;
  error: string | null;
}

export function useDocumentAnnotations(
  contentId: string
): UseDocumentAnnotationsReturn {
  // Delegate query + subscription to useAnnotations — one urql subscription only.
  const { annotations, fetching, error } = useAnnotations(
    contentId,
    ALL_LAYERS
  );

  const { focusedAnnotationId, setFocusedAnnotationId } = useUIStore();

  // useMutation for text-range annotations: spatialData is { from, to } not { timestampStart }.
  const [, createAnnotation] = useMutation(CREATE_ANNOTATION_MUTATION);

  // ── Derived lists ───────────────────────────────────────────────────────────

  const textAnnotations = useMemo((): TextRangeAnnotation[] => {
    return annotations
      .filter(hasTextRange)
      .map((ann) => ({
        id: ann.id,
        layer: ann.layer,
        textRange: getTextRange(ann),
      }))
      .sort((a, b) => a.textRange.from - b.textRange.from);
  }, [annotations]);

  const allAnnotations = useMemo(
    () =>
      annotations
        .filter(hasTextRange)
        .sort((a, b) => getTextRange(a).from - getTextRange(b).from),
    [annotations]
  );

  // ── addTextAnnotation ───────────────────────────────────────────────────────

  const addTextAnnotation = useCallback(
    async (input: DocumentAnnotationInput): Promise<void> => {
      await createAnnotation({
        input: {
          assetId: contentId,
          annotationType: 'TEXT',
          content: input.text,
          layer: input.layer,
          spatialData: { from: input.from, to: input.to },
        },
      });
    },
    [contentId, createAnnotation]
  );

  return {
    textAnnotations,
    allAnnotations,
    focusedAnnotationId,
    setFocusedAnnotationId,
    addTextAnnotation,
    fetching,
    error,
  };
}
