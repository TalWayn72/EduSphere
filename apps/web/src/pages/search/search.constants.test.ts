import { describe, it, expect } from 'vitest';
import { TYPE_CONFIG, TYPE_ORDER, SUGGESTED_QUERIES } from './search.constants';

describe('search.constants', () => {
  it('TYPE_CONFIG has all 4 types', () => {
    expect(Object.keys(TYPE_CONFIG)).toEqual(
      expect.arrayContaining(['course', 'transcript', 'annotation', 'concept'])
    );
  });

  it('each config has required fields', () => {
    for (const config of Object.values(TYPE_CONFIG)) {
      expect(config).toHaveProperty('label');
      expect(config).toHaveProperty('color');
      expect(config).toHaveProperty('bg');
    }
  });

  it('TYPE_ORDER has 4 entries', () => {
    expect(TYPE_ORDER).toHaveLength(4);
  });

  it('SUGGESTED_QUERIES is non-empty', () => {
    expect(SUGGESTED_QUERIES.length).toBeGreaterThan(0);
  });
});
