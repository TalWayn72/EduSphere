import { Annotation, AnnotationLayer } from '@/types/annotations';
import { mockAnnotations } from './mock-annotations.data';

export { mockAnnotations };

// Build threaded structure from flat annotation list
export const buildAnnotationThreads = (
  annotations: Annotation[]
): Annotation[] => {
  const annotationMap = new Map<string, Annotation>();
  const rootAnnotations: Annotation[] = [];

  annotations.forEach((ann) => {
    annotationMap.set(ann.id, { ...ann, replies: [] });
  });

  annotations.forEach((ann) => {
    const annotation = annotationMap.get(ann.id)!;
    if (ann.parentId) {
      const parent = annotationMap.get(ann.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(annotation);
      }
    } else {
      rootAnnotations.push(annotation);
    }
  });

  return rootAnnotations.sort((a, b) => {
    const timeA = a.contentTimestamp || 0;
    const timeB = b.contentTimestamp || 0;
    return timeA - timeB;
  });
};

export const getThreadedAnnotations = (): Annotation[] => {
  return buildAnnotationThreads(mockAnnotations);
};

export const filterAnnotationsByLayers = (
  annotations: Annotation[],
  enabledLayers: AnnotationLayer[]
): Annotation[] => {
  return annotations.filter((ann) => enabledLayers.includes(ann.layer));
};

export const getAnnotationCountByLayer = (
  annotations: Annotation[]
): Record<AnnotationLayer, number> => {
  return annotations.reduce(
    (acc, ann) => {
      acc[ann.layer] = (acc[ann.layer] || 0) + 1;
      return acc;
    },
    {} as Record<AnnotationLayer, number>
  );
};
