import { describe, it, expect } from 'vitest';
import {
  formatAnnotationTimestamp,
  ANNOTATION_LAYER_META,
} from './AnnotationCard';
import { AnnotationLayer } from '@/types/annotations';

describe('formatAnnotationTimestamp', () => {
  it('returns empty string for undefined', () => {
    expect(formatAnnotationTimestamp(undefined)).toBe('');
  });

  it('returns empty string for 0', () => {
    expect(formatAnnotationTimestamp(0)).toBe('');
  });

  it('formats 65 seconds as 1:05', () => {
    expect(formatAnnotationTimestamp(65)).toBe('1:05');
  });

  it('formats 30 seconds as 0:30', () => {
    expect(formatAnnotationTimestamp(30)).toBe('0:30');
  });

  it('formats 120 seconds as 2:00', () => {
    expect(formatAnnotationTimestamp(120)).toBe('2:00');
  });

  it('pads single-digit seconds with leading zero', () => {
    expect(formatAnnotationTimestamp(61)).toBe('1:01');
  });
});

describe('ANNOTATION_LAYER_META', () => {
  const allLayers = [
    AnnotationLayer.PERSONAL,
    AnnotationLayer.SHARED,
    AnnotationLayer.INSTRUCTOR,
    AnnotationLayer.AI_GENERATED,
  ];

  it('contains metadata for all four annotation layers', () => {
    allLayers.forEach((layer) => {
      expect(ANNOTATION_LAYER_META).toHaveProperty(layer);
    });
  });

  it('each layer has required fields', () => {
    allLayers.forEach((layer) => {
      const meta = ANNOTATION_LAYER_META[layer];
      expect(meta).toHaveProperty('label');
      expect(meta).toHaveProperty('color');
      expect(meta).toHaveProperty('bg');
      expect(meta).toHaveProperty('icon');
    });
  });

  it('PERSONAL layer shows lock icon', () => {
    expect(ANNOTATION_LAYER_META[AnnotationLayer.PERSONAL].icon).toBe('🔒');
  });

  it('INSTRUCTOR layer shows graduation icon', () => {
    expect(ANNOTATION_LAYER_META[AnnotationLayer.INSTRUCTOR].icon).toBe('🎓');
  });

  it('AI_GENERATED layer shows robot icon', () => {
    expect(ANNOTATION_LAYER_META[AnnotationLayer.AI_GENERATED].icon).toBe('🤖');
  });

  it('SHARED layer shows people icon', () => {
    expect(ANNOTATION_LAYER_META[AnnotationLayer.SHARED].icon).toBe('👥');
  });
});
