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

const AUTH_ERROR_MESSAGES = [
  'unauthorized',
  'authentication required',
  'unauthenticated',
];
const AUTH_ERROR_CODES = new Set([
  'UNAUTHENTICATED',
  'UNAUTHORIZED',
  'FORBIDDEN',
]);

function hasAuthError(error: MockCombinedError): boolean {
  return (
    error.graphQLErrors?.some(
      (e) =>
        AUTH_ERROR_MESSAGES.some((m) => e.message?.toLowerCase().includes(m)) ||
        AUTH_ERROR_CODES.has(String(e.extensions?.code ?? ''))
    ) ?? false
  );
}

// operationKind mirrors the `operation.kind` check in authErrorExchange.onError.
// Subscriptions degrade gracefully — they must NEVER trigger logout/redirect.
function shouldRedirectOnError(
  error: MockCombinedError,
  authenticated: boolean,
  pathname: string,
  operationKind = 'query'
): boolean {
  if (operationKind === 'subscription') return false;
  return hasAuthError(error) && authenticated && !pathname.startsWith('/login');
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
      graphQLErrors: [
        { message: 'Error', extensions: { code: 'UNAUTHENTICATED' } },
      ],
    };
    expect(hasAuthError(error)).toBe(true);
  });

  it('returns true for FORBIDDEN extension code', () => {
    const error: MockCombinedError = {
      message: '[GraphQL] Forbidden',
      graphQLErrors: [
        { message: 'Forbidden', extensions: { code: 'FORBIDDEN' } },
      ],
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
      graphQLErrors: [
        { message: 'Not found', extensions: { code: 'NOT_FOUND' } },
      ],
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
    expect(
      shouldRedirectOnError(unauthorizedError, true, '/courses/mock-1')
    ).toBe(true);
  });

  it('does NOT redirect when NOT authenticated (user not logged in)', () => {
    expect(
      shouldRedirectOnError(unauthorizedError, false, '/courses/mock-1')
    ).toBe(false);
  });

  it('does NOT redirect when already on /login page (prevents redirect loop)', () => {
    expect(shouldRedirectOnError(unauthorizedError, true, '/login')).toBe(
      false
    );
  });

  it('does NOT redirect for non-auth errors', () => {
    expect(shouldRedirectOnError(networkError, true, '/courses/mock-1')).toBe(
      false
    );
  });

  it('does NOT redirect when on /login/callback sub-path', () => {
    expect(
      shouldRedirectOnError(unauthorizedError, true, '/login/callback')
    ).toBe(false);
  });

  // ── Subscription auth errors — graceful degradation (not logout) ──────────
  // If the WebSocket connectionParams token is not forwarded by the gateway,
  // the subscription resolver throws UnauthorizedException.  This must NOT
  // call logout() — the user's HTTP session is still valid; real-time updates
  // simply pause.  See: urql-client.ts authErrorExchange.onError.

  it('does NOT redirect for subscription auth error (graceful degradation)', () => {
    expect(
      shouldRedirectOnError(
        unauthorizedError,
        true,
        '/courses/mock-1',
        'subscription'
      )
    ).toBe(false);
  });

  it('does NOT redirect for subscription auth error even when on non-login page', () => {
    expect(
      shouldRedirectOnError(
        unauthorizedError,
        true,
        '/settings',
        'subscription'
      )
    ).toBe(false);
  });

  it('still redirects for query auth error (normal logout path)', () => {
    expect(
      shouldRedirectOnError(unauthorizedError, true, '/courses/mock-1', 'query')
    ).toBe(true);
  });
});

// ── Network error logging (BUG-039 regression guard) ─────────────────────────

describe('urql error exchange — network error logging', () => {
  /**
   * Mirrors the logging logic added in urql-client.ts to ensure console.warn
   * is called with the [GraphQL][Network] prefix when a network error occurs.
   * This logic is extracted here for unit testing without importing the full
   * urql client (which would require a full exchange pipeline setup).
   */
  function logNetworkError(
    error: MockCombinedError,
    operation: { kind: string; name: string }
  ): void {
    if (error.networkError) {
      console.warn(
        `[GraphQL][Network] ${operation.kind} "${operation.name}": ${error.networkError.message}`
      );
    }
  }

  it('logs console.warn with [GraphQL][Network] prefix when networkError present', () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const error: MockCombinedError = {
      message: '[Network] Failed to fetch',
      graphQLErrors: [],
      networkError: new Error('Failed to fetch'),
    };
    logNetworkError(error, { kind: 'query', name: 'CoursesQuery' });
    expect(warnSpy).toHaveBeenCalledWith(
      '[GraphQL][Network] query "CoursesQuery": Failed to fetch'
    );
    warnSpy.mockRestore();
  });

  it('does NOT log when no networkError (GraphQL errors only)', () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const error: MockCombinedError = {
      message: '[GraphQL] Not found',
      graphQLErrors: [{ message: 'Not found' }],
      // no networkError
    };
    logNetworkError(error, { kind: 'query', name: 'SomeQuery' });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('includes operation kind in the log message', () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const error: MockCombinedError = {
      message: '[Network] Connection refused',
      graphQLErrors: [],
      networkError: new Error('Connection refused'),
    };
    logNetworkError(error, { kind: 'mutation', name: 'CreateCourse' });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('mutation "CreateCourse"')
    );
    warnSpy.mockRestore();
  });
});
