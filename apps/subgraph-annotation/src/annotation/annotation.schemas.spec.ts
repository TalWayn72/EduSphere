import { describe, it, expect } from 'vitest';
import {
  AnnotationType,
  AnnotationLayer,
  CreateAnnotationInputSchema,
  UpdateAnnotationInputSchema,
} from './annotation.schemas.js';

// ── AnnotationType enum ───────────────────────────────────────────────────────

describe('AnnotationType', () => {
  it('accepts all 5 valid annotation types', () => {
    const types = ['TEXT', 'SKETCH', 'LINK', 'BOOKMARK', 'SPATIAL_COMMENT'];
    for (const t of types) {
      expect(AnnotationType.parse(t)).toBe(t);
    }
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
