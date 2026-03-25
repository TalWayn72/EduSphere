import { describe, it, expect } from 'vitest';
import { useSavedSearches } from './useSavedSearches';

describe('useSavedSearches', () => {
  it('exports useSavedSearches function', () => {
    expect(typeof useSavedSearches).toBe('function');
  });
});
