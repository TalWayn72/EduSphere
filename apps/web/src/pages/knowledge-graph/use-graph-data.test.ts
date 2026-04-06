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

// ── GET_CONCEPTS_QUERY variable validation (BUG-fix: _refresh variable removal) ─
// The GET_CONCEPTS_QUERY only accepts `limit: Int` in the schema.
// Passing `_refresh` as a variable caused "Cannot return null for non-nullable
// field" GraphQL errors because the gateway rejected unknown variables.
// The urql mock returns plain strings, so we check the raw source directly.
describe('GET_CONCEPTS_QUERY — no invalid variables', () => {
  it('GET_CONCEPTS_QUERY does not contain _refresh variable', async () => {
    const { GET_CONCEPTS_QUERY } =
      await import('@/lib/graphql/knowledge.queries');
    // The urql gql mock joins template strings, so queryStr is the raw SDL text
    const queryStr = String(GET_CONCEPTS_QUERY);
    expect(queryStr).not.toContain('_refresh');
  });

  it('GET_CONCEPTS_QUERY source contains only limit variable declaration', async () => {
    const { GET_CONCEPTS_QUERY } =
      await import('@/lib/graphql/knowledge.queries');
    const queryStr = String(GET_CONCEPTS_QUERY);
    // Must have $limit but NOT $_refresh
    expect(queryStr).toContain('$limit');
    expect(queryStr).not.toContain('$_refresh');
  });
});
