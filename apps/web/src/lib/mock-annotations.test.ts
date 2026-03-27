/**
 * Tests for lib/mock-annotations.ts — Annotation helper functions
 *
 * Covers: buildAnnotationThreads, getThreadedAnnotations,
 * filterAnnotationsByLayers, getAnnotationCountByLayer.
 */
import { describe, it, expect } from 'vitest';
import {
  buildAnnotationThreads,
  getThreadedAnnotations,
  filterAnnotationsByLayers,
  getAnnotationCountByLayer,
  mockAnnotations,
} from './mock-annotations';
import { Annotation, AnnotationLayer } from '@/types/annotations';

const makeAnnotation = (overrides: Partial<Annotation> = {}): Annotation => ({
  id: 'test-1',
  content: 'Test annotation',
  layer: AnnotationLayer.PERSONAL,
  userId: 'user-1',
  userName: 'Test User',
  userRole: 'student',
  timestamp: '00:00:00',
  contentId: 'content-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('mockAnnotations', () => {
  it('is exported and is a non-empty array', () => {
    expect(Array.isArray(mockAnnotations)).toBe(true);
    expect(mockAnnotations.length).toBeGreaterThan(0);
  });
});

describe('buildAnnotationThreads', () => {
  it('returns root annotations (no parentId)', () => {
    const annotations = [
      makeAnnotation({ id: 'a', contentTimestamp: 10 }),
      makeAnnotation({ id: 'b', contentTimestamp: 20 }),
    ];
    const threads = buildAnnotationThreads(annotations);
    expect(threads).toHaveLength(2);
  });

  it('nests replies under parent annotations', () => {
    const annotations = [
      makeAnnotation({ id: 'parent', contentTimestamp: 10 }),
      makeAnnotation({ id: 'child', parentId: 'parent', contentTimestamp: 15 }),
    ];
    const threads = buildAnnotationThreads(annotations);
    expect(threads).toHaveLength(1);
    expect(threads[0]!.id).toBe('parent');
    expect(threads[0]!.replies).toHaveLength(1);
    expect(threads[0]!.replies![0]!.id).toBe('child');
  });

  it('sorts root annotations by contentTimestamp ascending', () => {
    const annotations = [
      makeAnnotation({ id: 'b', contentTimestamp: 20 }),
      makeAnnotation({ id: 'a', contentTimestamp: 10 }),
      makeAnnotation({ id: 'c', contentTimestamp: 30 }),
    ];
    const threads = buildAnnotationThreads(annotations);
    expect(threads.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles orphan replies (parent not in list)', () => {
    const annotations = [
      makeAnnotation({ id: 'orphan', parentId: 'nonexistent' }),
    ];
    // Orphan has a parentId but parent not found — should not appear as root
    const threads = buildAnnotationThreads(annotations);
    expect(threads).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    const threads = buildAnnotationThreads([]);
    expect(threads).toEqual([]);
  });
});

describe('getThreadedAnnotations', () => {
  it('returns a non-empty array of threaded annotations', () => {
    const result = getThreadedAnnotations();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('filterAnnotationsByLayers', () => {
  const annotations = [
    makeAnnotation({ id: 'a', layer: AnnotationLayer.PERSONAL }),
    makeAnnotation({ id: 'b', layer: AnnotationLayer.SHARED }),
    makeAnnotation({ id: 'c', layer: AnnotationLayer.INSTRUCTOR }),
    makeAnnotation({ id: 'd', layer: AnnotationLayer.AI_GENERATED }),
  ];

  it('filters to a single layer', () => {
    const result = filterAnnotationsByLayers(annotations, [AnnotationLayer.PERSONAL]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('a');
  });

  it('filters to multiple layers', () => {
    const result = filterAnnotationsByLayers(annotations, [
      AnnotationLayer.PERSONAL,
      AnnotationLayer.INSTRUCTOR,
    ]);
    expect(result).toHaveLength(2);
  });

  it('returns empty when no layers match', () => {
    const result = filterAnnotationsByLayers(annotations, []);
    expect(result).toHaveLength(0);
  });

  it('returns all when all layers enabled', () => {
    const result = filterAnnotationsByLayers(annotations, [
      AnnotationLayer.PERSONAL,
      AnnotationLayer.SHARED,
      AnnotationLayer.INSTRUCTOR,
      AnnotationLayer.AI_GENERATED,
    ]);
    expect(result).toHaveLength(4);
  });
});

describe('getAnnotationCountByLayer', () => {
  it('counts annotations per layer', () => {
    const annotations = [
      makeAnnotation({ id: 'a', layer: AnnotationLayer.PERSONAL }),
      makeAnnotation({ id: 'b', layer: AnnotationLayer.PERSONAL }),
      makeAnnotation({ id: 'c', layer: AnnotationLayer.INSTRUCTOR }),
    ];
    const counts = getAnnotationCountByLayer(annotations);
    expect(counts[AnnotationLayer.PERSONAL]).toBe(2);
    expect(counts[AnnotationLayer.INSTRUCTOR]).toBe(1);
  });

  it('returns empty-ish record for empty input', () => {
    const counts = getAnnotationCountByLayer([]);
    expect(counts[AnnotationLayer.PERSONAL]).toBeUndefined();
  });
});
