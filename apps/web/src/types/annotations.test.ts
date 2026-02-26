import { describe, it, expect } from 'vitest';
import {
  AnnotationLayer,
  ANNOTATION_LAYER_CONFIGS,
  type Annotation,
} from './annotations';

const baseAnnotation: Annotation = {
  id: 'ann-1',
  content: 'Test annotation',
  layer: AnnotationLayer.PERSONAL,
  userId: 'user-1',
  userName: 'Alice',
  userRole: 'student',
  timestamp: '2026-01-01T00:00:00Z',
  contentId: 'content-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('ANNOTATION_LAYER_CONFIGS — structure', () => {
  const allLayers = [
    AnnotationLayer.PERSONAL,
    AnnotationLayer.SHARED,
    AnnotationLayer.INSTRUCTOR,
    AnnotationLayer.AI_GENERATED,
  ];

  it('has all 4 layers', () => {
    allLayers.forEach((layer) => {
      expect(ANNOTATION_LAYER_CONFIGS).toHaveProperty(layer);
    });
  });

  it('each layer has label, icon, description, color', () => {
    allLayers.forEach((layer) => {
      const cfg = ANNOTATION_LAYER_CONFIGS[layer];
      expect(typeof cfg.label).toBe('string');
      expect(typeof cfg.icon).toBe('string');
      expect(typeof cfg.description).toBe('string');
      expect(typeof cfg.color).toBe('string');
    });
  });

  it('each layer has canCreate, canEdit, canDelete functions', () => {
    allLayers.forEach((layer) => {
      const cfg = ANNOTATION_LAYER_CONFIGS[layer];
      expect(typeof cfg.canCreate).toBe('function');
      expect(typeof cfg.canEdit).toBe('function');
      expect(typeof cfg.canDelete).toBe('function');
    });
  });
});

describe('PERSONAL layer', () => {
  const cfg = ANNOTATION_LAYER_CONFIGS[AnnotationLayer.PERSONAL];
  const ann = {
    ...baseAnnotation,
    layer: AnnotationLayer.PERSONAL,
    userId: 'user-1',
    userRole: 'student' as const,
  };

  it('canCreate returns true for student', () =>
    expect(cfg.canCreate('student')).toBe(true));
  it('canCreate returns true for instructor', () =>
    expect(cfg.canCreate('instructor')).toBe(true));
  it('canCreate returns true for ai', () =>
    expect(cfg.canCreate('ai')).toBe(true));

  it('canEdit returns true when userId matches', () => {
    expect(cfg.canEdit(ann, 'user-1')).toBe(true);
  });
  it('canEdit returns false when userId does not match', () => {
    expect(cfg.canEdit(ann, 'user-99')).toBe(false);
  });

  it('canDelete returns true when userId matches', () => {
    expect(cfg.canDelete(ann, 'user-1')).toBe(true);
  });
  it('canDelete returns false when userId does not match', () => {
    expect(cfg.canDelete(ann, 'user-99')).toBe(false);
  });
});

describe('SHARED layer', () => {
  const cfg = ANNOTATION_LAYER_CONFIGS[AnnotationLayer.SHARED];
  const ann = {
    ...baseAnnotation,
    layer: AnnotationLayer.SHARED,
    userId: 'user-2',
    userRole: 'student' as const,
  };

  it('canCreate returns true for student', () =>
    expect(cfg.canCreate('student')).toBe(true));
  it('canCreate returns true for instructor', () =>
    expect(cfg.canCreate('instructor')).toBe(true));
  it('canCreate returns true for ai', () =>
    expect(cfg.canCreate('ai')).toBe(true));

  it('canEdit returns true when userId matches', () => {
    expect(cfg.canEdit(ann, 'user-2')).toBe(true);
  });
  it('canEdit returns false when userId does not match', () => {
    expect(cfg.canEdit(ann, 'user-1')).toBe(false);
  });

  it('canDelete returns true when userId matches', () => {
    expect(cfg.canDelete(ann, 'user-2')).toBe(true);
  });
  it('canDelete returns false when userId does not match', () => {
    expect(cfg.canDelete(ann, 'user-1')).toBe(false);
  });
});

describe('INSTRUCTOR layer', () => {
  const cfg = ANNOTATION_LAYER_CONFIGS[AnnotationLayer.INSTRUCTOR];
  const instructorAnn = {
    ...baseAnnotation,
    layer: AnnotationLayer.INSTRUCTOR,
    userId: 'inst-1',
    userRole: 'instructor' as const,
  };
  const studentAnn = {
    ...baseAnnotation,
    layer: AnnotationLayer.INSTRUCTOR,
    userId: 'stu-1',
    userRole: 'student' as const,
  };

  it('canCreate returns false for student', () =>
    expect(cfg.canCreate('student')).toBe(false));
  it('canCreate returns true for instructor', () =>
    expect(cfg.canCreate('instructor')).toBe(true));
  it('canCreate returns false for ai', () =>
    expect(cfg.canCreate('ai')).toBe(false));

  it('canEdit returns true for instructor who owns annotation', () => {
    expect(cfg.canEdit(instructorAnn, 'inst-1')).toBe(true);
  });
  it('canEdit returns false for instructor who does not own annotation', () => {
    expect(cfg.canEdit(instructorAnn, 'inst-2')).toBe(false);
  });
  it('canEdit returns false for student annotation', () => {
    expect(cfg.canEdit(studentAnn, 'stu-1')).toBe(false);
  });

  it('canDelete returns true for instructor who owns annotation', () => {
    expect(cfg.canDelete(instructorAnn, 'inst-1')).toBe(true);
  });
  it('canDelete returns false for instructor who does not own annotation', () => {
    expect(cfg.canDelete(instructorAnn, 'inst-2')).toBe(false);
  });
  it('canDelete returns false for student annotation', () => {
    expect(cfg.canDelete(studentAnn, 'stu-1')).toBe(false);
  });
});

describe('AI_GENERATED layer', () => {
  const cfg = ANNOTATION_LAYER_CONFIGS[AnnotationLayer.AI_GENERATED];
  const ann = {
    ...baseAnnotation,
    layer: AnnotationLayer.AI_GENERATED,
    userId: 'ai-bot',
    userRole: 'ai' as const,
  };

  it('canCreate returns false for student', () =>
    expect(cfg.canCreate('student')).toBe(false));
  it('canCreate returns false for instructor', () =>
    expect(cfg.canCreate('instructor')).toBe(false));
  it('canCreate returns true for ai', () =>
    expect(cfg.canCreate('ai')).toBe(true));

  it('canEdit always returns false (even for owner)', () => {
    expect(cfg.canEdit(ann, 'ai-bot')).toBe(false);
  });
  it('canEdit returns false for other user', () => {
    expect(cfg.canEdit(ann, 'user-1')).toBe(false);
  });

  it('canDelete always returns false (even for owner)', () => {
    expect(cfg.canDelete(ann, 'ai-bot')).toBe(false);
  });
  it('canDelete returns false for other user', () => {
    expect(cfg.canDelete(ann, 'user-1')).toBe(false);
  });
});
