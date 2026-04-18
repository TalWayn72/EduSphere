import { describe, it, expect, vi } from 'vitest';

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: null, fetching: false, error: null }]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useLocation: () => ({ state: null, pathname: '/courses' }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => ({ id: 'u-1', role: 'STUDENT' }),
  DEV_MODE: true,
}));

import { useCourseListData, isNetworkOnlyError } from './useCourseListData';
import type { CombinedError } from 'urql';

// Helper to build a minimal CombinedError-like object
function makeError(
  opts: {
    networkError?: Error | null;
    graphQLErrors?: Array<{ message: string }>;
    message?: string;
  } = {}
): CombinedError {
  return {
    networkError: opts.networkError ?? null,
    graphQLErrors: opts.graphQLErrors ?? [],
    message: opts.message ?? 'error',
    name: 'CombinedError',
    [Symbol.iterator]: undefined,
  } as unknown as CombinedError;
}

describe('isNetworkOnlyError', () => {
  it('returns false when error is undefined', () => {
    expect(isNetworkOnlyError(undefined)).toBe(false);
  });

  it('returns false when error has only GraphQL errors (server responded)', () => {
    const err = makeError({
      graphQLErrors: [{ message: 'Not found' }],
    });
    expect(isNetworkOnlyError(err)).toBe(false);
  });

  it('returns false when error has both networkError and graphQLErrors', () => {
    // Hybrid case — treat conservatively as non-network-only
    const err = makeError({
      networkError: new Error('fetch failed'),
      graphQLErrors: [{ message: 'partial error' }],
    });
    expect(isNetworkOnlyError(err)).toBe(false);
  });

  it('returns false for auth-related GraphQL errors', () => {
    const err = makeError({
      graphQLErrors: [{ message: 'Unauthorized' }],
    });
    expect(isNetworkOnlyError(err)).toBe(false);
  });

  it('returns true when error has only networkError and no graphQLErrors', () => {
    const err = makeError({
      networkError: new Error('Failed to fetch'),
    });
    expect(isNetworkOnlyError(err)).toBe(true);
  });

  it('returns true when error has networkError and empty graphQLErrors array', () => {
    const err = makeError({
      networkError: new Error('connection refused'),
      graphQLErrors: [],
    });
    expect(isNetworkOnlyError(err)).toBe(true);
  });
});

describe('useCourseListData', () => {
  it('exports useCourseListData function', () => {
    expect(typeof useCourseListData).toBe('function');
  });
});
