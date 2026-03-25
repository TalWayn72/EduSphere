import { describe, it, expect, vi } from 'vitest';

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false, error: null }]),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@/lib/auth', () => ({ DEV_MODE: true }));

import { useGraphData } from './use-graph-data';

describe('useGraphData', () => {
  it('exports useGraphData function', () => {
    expect(typeof useGraphData).toBe('function');
  });
});
