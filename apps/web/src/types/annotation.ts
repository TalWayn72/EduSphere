export enum AnnotationLayer {
  PERSONAL = 'PERSONAL',
  SHARED = 'SHARED',
  INSTRUCTOR = 'INSTRUCTOR',
  AI_GENERATED = 'AI_GENERATED',
}

export enum AnnotationType {
  TEXT = 'TEXT',
  BOOKMARK = 'BOOKMARK',
  SPATIAL_COMMENT = 'SPATIAL_COMMENT',
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  layer: AnnotationLayer;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: 'STUDENT' | 'INSTRUCTOR' | 'AI';
  targetResourceId: string;
  targetPosition?: {
    startOffset: number;
    endOffset: number;
  };
  spatialData?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  parentId?: string;
  threadId?: string;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  isResolved: boolean;
}

export interface AnnotationThread {
  rootAnnotation: Annotation;
  replies: Annotation[];
}
