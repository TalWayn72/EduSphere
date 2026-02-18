import { describe, it, expect } from 'vitest';
import { formatTime, LAYER_META, SPEED_OPTIONS } from './content-viewer.utils';

describe('formatTime', () => {
  it('formats 0 seconds as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats 59 seconds as 0:59', () => {
    expect(formatTime(59)).toBe('0:59');
  });

  it('formats 60 seconds as 1:00', () => {
    expect(formatTime(60)).toBe('1:00');
  });

  it('formats 65 seconds as 1:05', () => {
    expect(formatTime(65)).toBe('1:05');
  });

  it('formats 300 seconds as 5:00', () => {
    expect(formatTime(300)).toBe('5:00');
  });

  it('formats 3661 seconds as 61:01', () => {
    expect(formatTime(3661)).toBe('61:01');
  });

  it('floors decimal seconds', () => {
    expect(formatTime(90.9)).toBe('1:30');
  });
});

describe('LAYER_META', () => {
  const expectedLayers = ['PERSONAL', 'SHARED', 'INSTRUCTOR', 'AI_GENERATED'];

  it('contains all four annotation layers', () => {
    expectedLayers.forEach((layer) => {
      expect(LAYER_META).toHaveProperty(layer);
    });
  });

  it('each layer has label, color, and bg properties', () => {
    expectedLayers.forEach((layer) => {
      const meta = LAYER_META[layer]!;
      expect(meta).toHaveProperty('label');
      expect(meta).toHaveProperty('color');
      expect(meta).toHaveProperty('bg');
      expect(typeof meta.label).toBe('string');
      expect(meta.label.length).toBeGreaterThan(0);
    });
  });

  it('PERSONAL layer has correct label', () => {
    expect(LAYER_META['PERSONAL']!.label).toBe('Personal');
  });

  it('AI_GENERATED layer has correct label', () => {
    expect(LAYER_META['AI_GENERATED']!.label).toBe('AI');
  });
});

describe('SPEED_OPTIONS', () => {
  it('contains expected playback speeds', () => {
    expect(SPEED_OPTIONS).toContain(1);
    expect(SPEED_OPTIONS).toContain(0.5);
    expect(SPEED_OPTIONS).toContain(2);
  });

  it('is sorted in ascending order', () => {
    const sorted = [...SPEED_OPTIONS].sort((a, b) => a - b);
    expect([...SPEED_OPTIONS]).toEqual(sorted);
  });

  it('has at least 4 speed options', () => {
    expect(SPEED_OPTIONS.length).toBeGreaterThanOrEqual(4);
  });

  it('normal speed (1x) is included', () => {
    expect(SPEED_OPTIONS).toContain(1);
  });
});
