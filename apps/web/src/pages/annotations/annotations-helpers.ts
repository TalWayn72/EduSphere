/**
 * AnnotationsPage helpers — type conversion and counting utilities.
 */
import { AnnotationLayer, type Annotation } from '@/types/annotations';

/** Shape returned by the annotationsByUser query. */
export interface BackendAnnotation {
  id: string;
  assetId: string;
  userId: string;
  layer: AnnotationLayer;
  annotationType: string;
  content: unknown;
  spatialData: unknown;
  parentId: string | null;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toAnnotation(
  a: BackendAnnotation,
  userName: string
): Annotation {
  const rawContent = a.content;
  const textContent =
    typeof rawContent === 'string'
      ? rawContent
      : typeof rawContent === 'object' &&
          rawContent !== null &&
          'text' in rawContent
        ? String((rawContent as Record<string, unknown>)['text'])
        : JSON.stringify(rawContent);

  return {
    id: a.id,
    content: textContent,
    layer: a.layer,
    userId: a.userId,
    userName,
    userRole: 'student',
    timestamp: a.createdAt,
    contentId: a.assetId,
    parentId: a.parentId ?? undefined,
    replies: [],
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export function getAnnotationCountByLayer(
  annotations: Annotation[]
): Record<AnnotationLayer, number> {
  return annotations.reduce(
    (acc, ann) => {
      acc[ann.layer] = (acc[ann.layer] ?? 0) + 1;
      return acc;
    },
    {} as Record<AnnotationLayer, number>
  );
}

export const ALL_LAYERS: AnnotationLayer[] = [
  AnnotationLayer.PERSONAL,
  AnnotationLayer.SHARED,
  AnnotationLayer.INSTRUCTOR,
  AnnotationLayer.AI_GENERATED,
];
