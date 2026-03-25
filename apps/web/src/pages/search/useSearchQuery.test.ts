import { describe, it, expect, vi } from 'vitest';

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('./search.utils', () => ({
  mockSearch: vi.fn(() => []),
}));

import { useSearchQuery } from './useSearchQuery';

describe('useSearchQuery', () => {
  it('exports useSearchQuery function', () => {
    expect(typeof useSearchQuery).toBe('function');
  });
});
