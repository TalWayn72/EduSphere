// vi.mock must be hoisted before any imports
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('@/lib/graphql/content-tier3.queries', () => ({
  SCENARIO_NODE_QUERY: 'SCENARIO_NODE_QUERY',
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as urql from 'urql';
import { useScenarioNode } from './useScenarioNode';

type UseQueryReturn = [
  { data: unknown; fetching: boolean; error: unknown },
  () => void,
];

function makeResult(
  overrides: Partial<{ data: unknown; fetching: boolean; error: unknown }>
): UseQueryReturn {
  return [
    { data: undefined, fetching: false, error: undefined, ...overrides },
    vi.fn(),
  ];
}

const mockScenarioNode = {
  id: 'sn-1',
  title: 'Opening Choice',
  description: 'Make your decision',
  isEndNode: false,
  choices: [
    { id: 'c1', text: 'Go left', nextContentItemId: 'item-left' },
    { id: 'c2', text: 'Go right', nextContentItemId: 'item-right' },
  ],
};

beforeEach(() => {
  vi.mocked(urql.useQuery).mockReturnValue(makeResult({}));
});

describe('useScenarioNode', () => {
  it('returns null scenarioNode when data is absent', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeResult({ data: {} }));
    const { result } = renderHook(() => useScenarioNode('ci-1'));
    expect(result.current.scenarioNode).toBeNull();
  });

  it('returns scenarioNode when present in data', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({ data: { scenarioNode: mockScenarioNode } })
    );
    const { result } = renderHook(() => useScenarioNode('ci-1'));
    expect(result.current.scenarioNode).toEqual(mockScenarioNode);
    expect(result.current.scenarioNode?.choices).toHaveLength(2);
  });

  it('fetching is passed through from result', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeResult({ fetching: true }));
    const { result } = renderHook(() => useScenarioNode('ci-1'));
    expect(result.current.fetching).toBe(true);
  });

  it('error.message is passed through when query errors', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({ error: { message: 'Scenario not found' } as unknown })
    );
    const { result } = renderHook(() => useScenarioNode('ci-1'));
    expect(result.current.error).toBe('Scenario not found');
  });

  it('pauses query when enabled=false', () => {
    renderHook(() => useScenarioNode('ci-1', false));
    const callArgs = vi.mocked(urql.useQuery).mock.calls[0]?.[0] as {
      pause?: boolean;
    };
    expect(callArgs?.pause).toBe(true);
  });

  it('does not pause query when enabled=true', () => {
    renderHook(() => useScenarioNode('ci-1', true));
    const callArgs = vi.mocked(urql.useQuery).mock.calls[0]?.[0] as {
      pause?: boolean;
    };
    expect(callArgs?.pause).toBe(false);
  });

  it('passes contentItemId as variable to the query', () => {
    renderHook(() => useScenarioNode('my-content-42'));
    const callArgs = vi.mocked(urql.useQuery).mock.calls[0]?.[0] as {
      variables?: Record<string, unknown>;
    };
    expect(callArgs?.variables?.contentItemId).toBe('my-content-42');
  });

  it('error is null when no error', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({ data: { scenarioNode: mockScenarioNode } })
    );
    const { result } = renderHook(() => useScenarioNode('ci-2'));
    expect(result.current.error).toBeNull();
  });
});
