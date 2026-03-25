import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/mock-content-data', () => ({
  mockTranscript: [
    { id: 't-1', text: 'Hello Talmud study', startTime: 10 },
    { id: 't-2', text: 'Another text', startTime: 30 },
  ],
}));

vi.mock('@/lib/mock-annotations', () => ({
  getThreadedAnnotations: () => [
    { id: 'a-1', content: 'Talmud annotation', userName: 'User', layer: 'personal', contentTimestamp: 5 },
  ],
}));

vi.mock('@/lib/mock-graph-data', () => ({
  mockGraphData: {
    nodes: [
      { id: 'n-1', label: 'Talmud Concept', type: 'Concept', description: 'A concept' },
    ],
  },
}));

import { formatTime, mockSearch } from './search.utils';

describe('formatTime', () => {
  it('formats seconds to m:ss', () => {
    expect(formatTime(90)).toBe('1:30');
  });

  it('formats zero', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('pads seconds', () => {
    expect(formatTime(65)).toBe('1:05');
  });
});

describe('mockSearch', () => {
  it('returns empty for empty query', () => {
    expect(mockSearch('')).toEqual([]);
  });

  it('returns empty for single char query', () => {
    expect(mockSearch('a')).toEqual([]);
  });

  it('returns results for matching query', () => {
    const results = mockSearch('Talmud');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns results with type field', () => {
    const results = mockSearch('Talmud');
    results.forEach(r => {
      expect(['course', 'transcript', 'annotation', 'concept']).toContain(r.type);
    });
  });
});
