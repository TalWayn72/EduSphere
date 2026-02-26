export interface TextRange {
  from: number;
  to: number;
}

export enum AnnotationLayer {
  PERSONAL = 'PERSONAL',
  SHARED = 'SHARED',
  INSTRUCTOR = 'INSTRUCTOR',
  AI_GENERATED = 'AI_GENERATED',
}

export interface Annotation {
  id: string;
  content: string;
  layer: AnnotationLayer;
  userId: string;
  userName: string;
  userRole: 'student' | 'instructor' | 'ai';
  timestamp: string;
  contentId: string;
  contentTimestamp?: number; // For video/audio annotations
  parentId?: string; // For threaded replies
  replies?: Annotation[];
  createdAt: string;
  updatedAt: string;
  textRange?: TextRange;
}

export interface AnnotationThread {
  parent: Annotation;
  replies: Annotation[];
}

export interface AnnotationLayerConfig {
  layer: AnnotationLayer;
  label: string;
  icon: string;
  description: string;
  color: string;
  canCreate: (userRole: 'student' | 'instructor' | 'ai') => boolean;
  canEdit: (annotation: Annotation, currentUserId: string) => boolean;
  canDelete: (annotation: Annotation, currentUserId: string) => boolean;
}

export const ANNOTATION_LAYER_CONFIGS: Record<
  AnnotationLayer,
  AnnotationLayerConfig
> = {
  [AnnotationLayer.PERSONAL]: {
    layer: AnnotationLayer.PERSONAL,
    label: 'Private',
    icon: '🔒',
    description: 'Only you can see these annotations',
    color: 'text-blue-600',
    canCreate: () => true,
    canEdit: (annotation, currentUserId) => annotation.userId === currentUserId,
    canDelete: (annotation, currentUserId) =>
      annotation.userId === currentUserId,
  },
  [AnnotationLayer.SHARED]: {
    layer: AnnotationLayer.SHARED,
    label: 'Public',
    icon: '👥',
    description: 'All students can see these annotations',
    color: 'text-green-600',
    canCreate: () => true,
    canEdit: (annotation, currentUserId) => annotation.userId === currentUserId,
    canDelete: (annotation, currentUserId) =>
      annotation.userId === currentUserId,
  },
  [AnnotationLayer.INSTRUCTOR]: {
    layer: AnnotationLayer.INSTRUCTOR,
    label: 'Authority',
    icon: '🎓',
    description: 'Instructor annotations (read-only for students)',
    color: 'text-purple-600',
    canCreate: (userRole) => userRole === 'instructor',
    canEdit: (annotation, currentUserId) =>
      annotation.userRole === 'instructor' &&
      annotation.userId === currentUserId,
    canDelete: (annotation, currentUserId) =>
      annotation.userRole === 'instructor' &&
      annotation.userId === currentUserId,
  },
  [AnnotationLayer.AI_GENERATED]: {
    layer: AnnotationLayer.AI_GENERATED,
    label: 'AI Insights',
    icon: '🤖',
    description: 'AI-generated insights and suggestions',
    color: 'text-orange-600',
    canCreate: (userRole) => userRole === 'ai',
    canEdit: () => false,
    canDelete: () => false,
  },
};
