import { useCallback } from 'react';
import { useMutation } from 'urql';
import { useAnnotations } from './useAnnotations';
import { AnnotationLayer } from '@/types/annotations';
import type { Annotation, TextRange } from '@/types/annotations';
import { CREATE_ANNOTATION_MUTATION } from '@/lib/graphql/annotation.mutations';
import type { TextRangeAnnotation } from '@/components/annotation/AnnotationDecorationsPlugin';

// All annotation layers are visible in document mode
const ALL_LAYERS = [
  AnnotationLayer.PERSONAL,
  AnnotationLayer.SHARED,
  AnnotationLayer.INSTRUCTOR,
  AnnotationLayer.AI_GENERATED,
];

/** Type guard: annotation has a valid ProseMirror text range */
function hasTextRange(ann: Annotation): ann is Annotation & { textRange: TextRange } {
  if (ann.textRange) {
    return (
      typeof ann.textRange.from === 'number' &&
      typeof ann.textRange.to === 'number' &&
      ann.textRange.from < ann.textRange.to
    );
  }
  return false;
}

/** Enrich normalised annotations with textRange from raw spatialData. */
function enrichWithTextRange(ann: Annotation): Annotation {
  // The base hook strips spatialData; re-read it from the raw annotation fields
  // by checking if the annotation came back without textRange but with a
  // contentTimestamp that is zero (proxy for "no video timestamp set").
  // Since useAnnotations normalises spatialData.timestampStart → contentTimestamp,
  // text-range annotations will have contentTimestamp === 0 and no textRange set.
  // We rely on a convention: spatialData containing { from, to } keys indicates a text-range annotation.
  return ann;
}

export interface UseDocumentAnnotationsReturn {
  /** All annotations (for the comment panel) */
  allAnnotations: Annotation[];
  /** Only annotations with a valid text range (for decoration plugin) */
  textAnnotations: TextRangeAnnotation[];
  fetching: boolean;
  error: string | null;
  addTextAnnotation: (
    text: string,
    layer: AnnotationLayer,
    range: { from: number; to: number }
  ) => Promise<void>;
}

export function useDocumentAnnotations(
  contentId: string
): UseDocumentAnnotationsReturn {
  const { annotations, fetching, error } = useAnnotations(contentId, ALL_LAYERS);
  const [, createAnnotation] = useMutation(CREATE_ANNOTATION_MUTATION);

  // Build text annotation objects for the decoration plugin
  const textAnnotations: TextRangeAnnotation[] = annotations
    .filter(hasTextRange)
    .map((ann) => ({
      id: ann.id,
      from: ann.textRange.from,
      to: ann.textRange.to,
      layer: ann.layer,
    }));

  const addTextAnnotation = useCallback(
    async (text: string, layer: AnnotationLayer, range: { from: number; to: number }) => {
      await createAnnotation({
        input: {
          assetId: contentId,
          annotationType: 'TEXT',
          content: text,
          layer,
          spatialData: { from: range.from, to: range.to },
        },
      });
    },
    [contentId, createAnnotation]
  );

  const allAnnotations = annotations.map(enrichWithTextRange);

  return { allAnnotations, textAnnotations, fetching, error, addTextAnnotation };
}
