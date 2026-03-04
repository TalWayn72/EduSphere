import { describe, it, expect } from 'vitest';
import {
  AnnotationType,
  AnnotationLayer,
  CreateAnnotationInputSchema,
  UpdateAnnotationInputSchema,
  TextRangeInputSchema,
} from './annotation.schemas.js';

// ── AnnotationType enum ───────────────────────────────────────────────────────

describe('AnnotationType', () => {
  it('accepts all 7 valid annotation types', () => {
    const types = [
      'TEXT',
      'SKETCH',
      'LINK',
      'BOOKMARK',
      'SPATIAL_COMMENT',
      'INLINE_COMMENT',
      'SUGGESTION',
    ];
    for (const t of types) {
      expect(AnnotationType.parse(t)).toBe(t);
    }
  });

  it('accepts INLINE_COMMENT type', () => {
    expect(AnnotationType.parse('INLINE_COMMENT')).toBe('INLINE_COMMENT');
  });

  it('accepts SUGGESTION type', () => {
    expect(AnnotationType.parse('SUGGESTION')).toBe('SUGGESTION');
  });

  it('rejects an unknown annotation type', () => {
    expect(() => AnnotationType.parse('AUDIO')).toThrow();
  });
});

// ── AnnotationLayer enum ──────────────────────────────────────────────────────

describe('AnnotationLayer', () => {
  it('accepts all 4 valid layer values', () => {
    const layers = ['PERSONAL', 'SHARED', 'INSTRUCTOR', 'AI_GENERATED'];
    for (const l of layers) {
      expect(AnnotationLayer.parse(l)).toBe(l);
    }
  });

  it('rejects an unknown layer', () => {
    expect(() => AnnotationLayer.parse('PUBLIC')).toThrow();
  });
});

// ── CreateAnnotationInputSchema ───────────────────────────────────────────────

describe('CreateAnnotationInputSchema', () => {
  const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  const valid = {
    assetId: uuid,
    annotationType: 'TEXT',
    content: { text: 'Hello world' },
  };

  it('parses a minimal valid annotation input with default layer', () => {
    const result = CreateAnnotationInputSchema.parse(valid);
    expect(result.assetId).toBe(uuid);
    expect(result.annotationType).toBe('TEXT');
    expect(result.layer).toBe('PERSONAL'); // default
    expect(result.content).toEqual({ text: 'Hello world' });
  });

  it('accepts an explicit layer override', () => {
    const result = CreateAnnotationInputSchema.parse({
      ...valid,
      layer: 'SHARED',
    });
    expect(result.layer).toBe('SHARED');
  });

  it('accepts optional spatialData', () => {
    const result = CreateAnnotationInputSchema.parse({
      ...valid,
      spatialData: { x: 10, y: 20, page: 1 },
    });
    expect(result.spatialData).toEqual({ x: 10, y: 20, page: 1 });
  });

  it('accepts optional parentId as a UUID', () => {
    const parentId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
    const result = CreateAnnotationInputSchema.parse({ ...valid, parentId });
    expect(result.parentId).toBe(parentId);
  });

  it('rejects invalid assetId (non-UUID)', () => {
    expect(() =>
      CreateAnnotationInputSchema.parse({ ...valid, assetId: 'not-a-uuid' })
    ).toThrow();
  });

  it('rejects invalid annotationType', () => {
    expect(() =>
      CreateAnnotationInputSchema.parse({
        ...valid,
        annotationType: 'VIDEO_NOTE',
      })
    ).toThrow();
  });

  it('rejects invalid layer value', () => {
    expect(() =>
      CreateAnnotationInputSchema.parse({ ...valid, layer: 'PUBLIC' })
    ).toThrow();
  });

  it('rejects invalid parentId (non-UUID)', () => {
    expect(() =>
      CreateAnnotationInputSchema.parse({ ...valid, parentId: 'bad-parent' })
    ).toThrow();
  });

  it('accepts SPATIAL_COMMENT annotation type with spatialData', () => {
    const result = CreateAnnotationInputSchema.parse({
      ...valid,
      annotationType: 'SPATIAL_COMMENT',
      spatialData: { x: 50, y: 75 },
    });
    expect(result.annotationType).toBe('SPATIAL_COMMENT');
  });

  it('accepts SKETCH annotation type', () => {
    const result = CreateAnnotationInputSchema.parse({
      ...valid,
      annotationType: 'SKETCH',
      content: { strokes: [] },
    });
    expect(result.annotationType).toBe('SKETCH');
  });

  it('accepts INLINE_COMMENT type with textRange', () => {
    const result = CreateAnnotationInputSchema.parse({
      ...valid,
      annotationType: 'INLINE_COMMENT',
      textRange: { start: 10, end: 25 },
    });
    expect(result.annotationType).toBe('INLINE_COMMENT');
    expect(result.textRange?.start).toBe(10);
    expect(result.textRange?.end).toBe(25);
    expect(result.textRange?.rangeType).toBe('character');
  });

  it('accepts SUGGESTION type with textRange and custom rangeType', () => {
    const result = CreateAnnotationInputSchema.parse({
      ...valid,
      annotationType: 'SUGGESTION',
      textRange: { start: 0, end: 50, rangeType: 'word' },
    });
    expect(result.annotationType).toBe('SUGGESTION');
    expect(result.textRange?.rangeType).toBe('word');
  });

  it('accepts omitted textRange (optional)', () => {
    const result = CreateAnnotationInputSchema.parse(valid);
    expect(result.textRange).toBeUndefined();
  });

  it('rejects textRange with negative start offset', () => {
    expect(() =>
      CreateAnnotationInputSchema.parse({
        ...valid,
        annotationType: 'INLINE_COMMENT',
        textRange: { start: -1, end: 10 },
      })
    ).toThrow();
  });
});

// ── TextRangeInputSchema ──────────────────────────────────────────────────────

describe('TextRangeInputSchema', () => {
  it('parses valid range with default rangeType', () => {
    const result = TextRangeInputSchema.parse({ start: 5, end: 20 });
    expect(result.start).toBe(5);
    expect(result.end).toBe(20);
    expect(result.rangeType).toBe('character');
  });

  it('accepts explicit rangeType', () => {
    const result = TextRangeInputSchema.parse({ start: 0, end: 100, rangeType: 'word' });
    expect(result.rangeType).toBe('word');
  });

  it('rejects non-integer start', () => {
    expect(() => TextRangeInputSchema.parse({ start: 1.5, end: 10 })).toThrow();
  });

  it('rejects negative start offset', () => {
    expect(() => TextRangeInputSchema.parse({ start: -1, end: 10 })).toThrow();
  });

  it('rejects missing end', () => {
    expect(() => TextRangeInputSchema.parse({ start: 0 })).toThrow();
  });
});

// ── UpdateAnnotationInputSchema ───────────────────────────────────────────────

describe('UpdateAnnotationInputSchema', () => {
  it('parses an empty object (all fields optional)', () => {
    const result = UpdateAnnotationInputSchema.parse({});
    expect(result.content).toBeUndefined();
    expect(result.spatialData).toBeUndefined();
    expect(result.isResolved).toBeUndefined();
  });

  it('accepts partial update with only content', () => {
    const result = UpdateAnnotationInputSchema.parse({
      content: { text: 'Updated' },
    });
    expect(result.content).toEqual({ text: 'Updated' });
    expect(result.isResolved).toBeUndefined();
  });

  it('accepts partial update with only isResolved', () => {
    const result = UpdateAnnotationInputSchema.parse({ isResolved: true });
    expect(result.isResolved).toBe(true);
  });

  it('accepts all fields simultaneously', () => {
    const result = UpdateAnnotationInputSchema.parse({
      content: { note: 'New content' },
      spatialData: { page: 2 },
      isResolved: false,
    });
    expect(result.content).toEqual({ note: 'New content' });
    expect(result.spatialData).toEqual({ page: 2 });
    expect(result.isResolved).toBe(false);
  });

  it('rejects non-boolean isResolved', () => {
    expect(() =>
      UpdateAnnotationInputSchema.parse({ isResolved: 'yes' })
    ).toThrow();
  });
});
