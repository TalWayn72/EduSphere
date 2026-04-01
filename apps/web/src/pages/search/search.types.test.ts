import { describe, it, expect } from 'vitest';
import type { ResultType, SavedSearch, SearchResult } from './search.types';

describe('search/search.types', () => {
  it('ResultType accepts valid values', () => {
    const types: ResultType[] = [
      'transcript',
      'annotation',
      'concept',
      'course',
    ];
    expect(types).toHaveLength(4);
  });

  it('SavedSearch shape is valid', () => {
    const saved: SavedSearch = {
      id: '1',
      name: 'My Search',
      query: 'talmud',
      filters: null,
      createdAt: '2026-01-01',
    };
    expect(saved.filters).toBeNull();
  });

  it('SearchResult shape is valid', () => {
    const result: SearchResult = {
      id: '1',
      type: 'course',
      title: 'Test',
      snippet: 'A test snippet',
    };
    expect(result.type).toBe('course');
    expect(result.meta).toBeUndefined();
  });

  it('SearchResult with optional fields', () => {
    const result: SearchResult = {
      id: '1',
      type: 'transcript',
      title: 'Test',
      snippet: 'Snippet',
      meta: 'Chapter 1',
      timestamp: 120,
      href: '/content/1',
    };
    expect(result.meta).toBe('Chapter 1');
    expect(result.timestamp).toBe(120);
  });
});
