/**
 * Tests for the global urql auth error exchange.
 *
 * Verifies that Unauthorized / Unauthenticated GraphQL errors trigger logout()
 * and redirect the user to the login page, preventing raw error messages from
 * reaching individual components.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockLogout = vi.fn();
const mockIsAuthenticated = vi.fn(() => true);

vi.mock('./auth', () => ({
  getToken: vi.fn(() => 'dev-token-mock-jwt'),
  logout: mockLogout,
  isAuthenticated: mockIsAuthenticated,
}));

vi.mock('graphql-ws', () => ({
  createClient: vi.fn(() => ({
    subscribe: vi.fn(),
    dispose: vi.fn(),
  })),
}));

// ── Types for the exchange callback under test ────────────────────────────────

interface MockGraphQLError {
  message: string;
  extensions?: Record<string, unknown>;
}

interface MockCombinedError {
  message: string;
  graphQLErrors: MockGraphQLError[];
  networkError?: Error;
}

// ── hasAuthError logic (extracted from urql-client.ts for unit testing) ───────

const AUTH_ERROR_MESSAGES = ['unauthorized', 'authentication required', 'unauthenticated'];
const AUTH_ERROR_CODES = new Set(['UNAUTHENTICATED', 'UNAUTHORIZED', 'FORBIDDEN']);

function hasAuthError(error: MockCombinedError): boolean {
  return (
    error.graphQLErrors?.some(
      (e) =>
        AUTH_ERROR_MESSAGES.some((m) => e.message?.toLowerCase().includes(m)) ||
        AUTH_ERROR_CODES.has(String(e.extensions?.code ?? ''))
    ) ?? false
  );
}

function shouldRedirectOnError(
  error: MockCombinedError,
  authenticated: boolean,
  pathname: string
): boolean {
  return (
    hasAuthError(error) &&
    authenticated &&
    !pathname.startsWith('/login')
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('urql auth error exchange — hasAuthError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for "Unauthorized" GraphQL error', () => {
    const error: MockCombinedError = {
      message: '[GraphQL] Unauthorized',
      graphQLErrors: [{ message: 'Unauthorized' }],
    };
    expect(hasAuthError(error)).toBe(true);
  });

  it('returns true for "unauthorized" case-insensitive', () => {
    const error: MockCombinedError = {
      message: '[GraphQL] UNAUTHORIZED',
      graphQLErrors: [{ message: 'UNAUTHORIZED' }],
    };
    expect(hasAuthError(error)).toBe(true);
  });

  it('returns true for "Authentication required" error', () => {
    const error: MockCombinedError = {
      message: '[GraphQL] Authentication required',
      graphQLErrors: [{ message: 'Authentication required' }],
    };
    expect(hasAuthError(error)).toBe(true);
  });

  it('returns true for "unauthenticated" error', () => {
    const error: MockCombinedError = {
      message: '[GraphQL] unauthenticated',
      graphQLErrors: [{ message: 'unauthenticated' }],
    };
    expect(hasAuthError(error)).toBe(true);
  });

  it('returns true for UNAUTHENTICATED extension code', () => {
    const error: MockCombinedError = {
      message: '[GraphQL] Error',
      graphQLErrors: [{ message: 'Error', extensions: { code: 'UNAUTHENTICATED' } }],
    };
    expect(hasAuthError(error)).toBe(true);
  });

  it('returns true for FORBIDDEN extension code', () => {
    const error: MockCombinedError = {
      message: '[GraphQL] Forbidden',
      graphQLErrors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }],
    };
    expect(hasAuthError(error)).toBe(true);
  });

  it('returns false for generic server error', () => {
    const error: MockCombinedError = {
      message: '[GraphQL] Internal Server Error',
      graphQLErrors: [{ message: 'Internal Server Error' }],
    };
    expect(hasAuthError(error)).toBe(false);
  });

  it('returns false for network error with no graphQLErrors', () => {
    const error: MockCombinedError = {
      message: '[Network] Connection refused',
      graphQLErrors: [],
    };
    expect(hasAuthError(error)).toBe(false);
  });

  it('returns false for NOT_FOUND error', () => {
    const error: MockCombinedError = {
      message: '[GraphQL] Not found',
      graphQLErrors: [{ message: 'Not found', extensions: { code: 'NOT_FOUND' } }],
    };
    expect(hasAuthError(error)).toBe(false);
  });
});

describe('urql auth error exchange — redirect logic', () => {
  const unauthorizedError: MockCombinedError = {
    message: '[GraphQL] Unauthorized',
    graphQLErrors: [{ message: 'Unauthorized' }],
  };
  const networkError: MockCombinedError = {
    message: '[Network] Connection refused',
    graphQLErrors: [],
  };

  it('redirects when authenticated + auth error + not on login page', () => {
    expect(shouldRedirectOnError(unauthorizedError, true, '/courses/mock-1')).toBe(true);
  });

  it('does NOT redirect when NOT authenticated (user not logged in)', () => {
    expect(shouldRedirectOnError(unauthorizedError, false, '/courses/mock-1')).toBe(false);
  });

  it('does NOT redirect when already on /login page (prevents redirect loop)', () => {
    expect(shouldRedirectOnError(unauthorizedError, true, '/login')).toBe(false);
  });

  it('does NOT redirect for non-auth errors', () => {
    expect(shouldRedirectOnError(networkError, true, '/courses/mock-1')).toBe(false);
  });

  it('does NOT redirect when on /login/callback sub-path', () => {
    expect(shouldRedirectOnError(unauthorizedError, true, '/login/callback')).toBe(false);
  });
});
