import { describe, it, expect } from 'vitest';
import { isAnnotationEvent } from './annotation-events.js';

describe('annotation-events type guards', () => {
  describe('isAnnotationEvent', () => {
    const validAnnotation = {
      type: 'annotation.created' as const,
      annotationId: 'ann-001',
      assetId: 'asset-001',
      userId: 'user-001',
      tenantId: 'tenant-001',
      layer: 'PERSONAL' as const,
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid annotation.created event', () => {
      expect(isAnnotationEvent(validAnnotation)).toBe(true);
    });

    it('returns true for annotation.updated event', () => {
      expect(
        isAnnotationEvent({ ...validAnnotation, type: 'annotation.updated' })
      ).toBe(true);
    });

    it('returns true for annotation.deleted event', () => {
      expect(
        isAnnotationEvent({ ...validAnnotation, type: 'annotation.deleted' })
      ).toBe(true);
    });

    it('returns true for annotation.resolved event', () => {
      expect(
        isAnnotationEvent({ ...validAnnotation, type: 'annotation.resolved' })
      ).toBe(true);
    });

    it('returns true without optional layer field', () => {
      const { layer: _, ...rest } = validAnnotation;
      expect(isAnnotationEvent(rest)).toBe(true);
    });

    it('returns true for all annotation layers', () => {
      for (const layer of ['PERSONAL', 'SHARED', 'INSTRUCTOR', 'AI_GENERATED']) {
        expect(isAnnotationEvent({ ...validAnnotation, layer })).toBe(true);
      }
    });

    it('returns false for null', () => {
      expect(isAnnotationEvent(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAnnotationEvent(undefined)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isAnnotationEvent(42)).toBe(false);
      expect(isAnnotationEvent('string')).toBe(false);
      expect(isAnnotationEvent(true)).toBe(false);
    });

    it('returns false when annotationId is missing', () => {
      const { annotationId: _, ...rest } = validAnnotation;
      expect(isAnnotationEvent(rest)).toBe(false);
    });

    it('returns false when assetId is missing', () => {
      const { assetId: _, ...rest } = validAnnotation;
      expect(isAnnotationEvent(rest)).toBe(false);
    });

    it('returns false when annotationId is not a string', () => {
      expect(
        isAnnotationEvent({ ...validAnnotation, annotationId: 123 })
      ).toBe(false);
    });

    it('returns false when assetId is not a string', () => {
      expect(
        isAnnotationEvent({ ...validAnnotation, assetId: null })
      ).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isAnnotationEvent({})).toBe(false);
    });
  });
});
