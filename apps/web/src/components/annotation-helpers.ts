/**
 * Utility functions for annotation tree building and formatting.
 * Extracted from AnnotationPanel for file-size compliance.
 */
import type { Annotation, AnnotationLayer } from '@/types/annotations';

export function buildAnnotationTree(annotations: Annotation[]): Annotation[] {
  const annotationMap = new Map<string, Annotation>();
  const result: Annotation[] = [];

  // First pass: create map
  annotations.forEach((ann) => {
    annotationMap.set(ann.id, { ...ann, replies: [] });
  });

  // Second pass: build relationships
  annotations.forEach((ann) => {
    const annotation = annotationMap.get(ann.id)!;
    if (ann.parentId) {
      const parent = annotationMap.get(ann.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(annotation);
      }
    } else {
      result.push(annotation);
    }
  });

  return result;
}

export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function createAnnotation(
  content: string,
  layer: AnnotationLayer,
  userId: string,
  userRole: 'student' | 'instructor' | 'ai',
  contentId: string,
  timestamp: string,
  contentTimestamp?: number,
  parentId?: string
): Annotation {
  return {
    id: `ann-${Date.now()}`,
    content,
    layer,
    userId,
    userName: 'You',
    userRole,
    timestamp,
    contentId,
    contentTimestamp,
    parentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
  };
}
