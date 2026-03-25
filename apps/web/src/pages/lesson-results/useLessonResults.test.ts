import { describe, it, expect, vi } from 'vitest';

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false, error: null }]),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ courseId: 'c-1', lessonId: 'l-1' }),
}));

vi.mock('@/lib/auth', () => ({ DEV_MODE: true }));

import { extractResults } from './useLessonResults';

describe('useLessonResults', () => {
  it('exports extractResults function', () => {
    expect(typeof extractResults).toBe('function');
  });

  it('returns empty results for empty input', () => {
    const result = extractResults([], []);
    expect(result.ingestion).toBeUndefined();
    expect(result.asr).toBeUndefined();
  });
});
