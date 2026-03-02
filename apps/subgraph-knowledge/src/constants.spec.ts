import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONCEPT_LIMIT,
  MAX_CONCEPT_LIMIT,
  DEFAULT_SEARCH_LIMIT,
} from './constants.js';

describe('knowledge subgraph constants', () => {
  it('DEFAULT_CONCEPT_LIMIT is 20', () => {
    expect(DEFAULT_CONCEPT_LIMIT).toBe(20);
  });

  it('MAX_CONCEPT_LIMIT is 200', () => {
    expect(MAX_CONCEPT_LIMIT).toBe(200);
  });

  it('DEFAULT_SEARCH_LIMIT is 10', () => {
    expect(DEFAULT_SEARCH_LIMIT).toBe(10);
  });

  it('MAX_CONCEPT_LIMIT is greater than DEFAULT_CONCEPT_LIMIT', () => {
    expect(MAX_CONCEPT_LIMIT).toBeGreaterThan(DEFAULT_CONCEPT_LIMIT);
  });

  it('all constants are positive integers', () => {
    for (const val of [
      DEFAULT_CONCEPT_LIMIT,
      MAX_CONCEPT_LIMIT,
      DEFAULT_SEARCH_LIMIT,
    ]) {
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThan(0);
    }
  });
});
