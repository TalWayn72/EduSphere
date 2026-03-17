import {
  createClient,
  fetchExchange,
  subscriptionExchange,
  errorExchange,
} from 'urql';
import type { CombinedError, Operation } from 'urql';
import { cacheExchange } from '@urql/exchange-graphcache';
import { persistedExchange } from '@urql/exchange-persisted';
import { createClient as createWsClient } from 'graphql-ws';
import { getToken, logout, isAuthenticated } from './auth';

// ─── Auth error detection ─────────────────────────────────────────────────────
// Intercepts Unauthorized / Unauthenticated GraphQL errors globally and calls
// logout() → redirects to /login.  Prevents raw "[GraphQL] Unauthorized"
// strings from surfacing in individual component error states.

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

function hasAuthError(error: CombinedError): boolean {
  return (
    error.graphQLErrors?.some(
      (e) =>
        AUTH_ERROR_MESSAGES.some((m) => e.message?.toLowerCase().includes(m)) ||
        AUTH_ERROR_CODES.has(
          String((e.extensions as Record<string, unknown>)?.code ?? '')
        )
    ) ?? false
  );
}

// Rate-limit subscription auth warnings: log at most once per subscription
// operation name per page session. Without this, urql reconnect loops cause
// the same warning to appear 5+ times in the browser console.
const _warnedSubscriptionOps = new Set<string>();

const authErrorExchange = errorExchange({
  // onError receives the operation as the second argument (urql errorExchange API).
  // Subscription auth failures (e.g. notificationReceived when the WebSocket
  // connectionParams token is not forwarded by the gateway) must NOT trigger a
  // global logout — the user's HTTP session is still valid and queries work.
  // Subscriptions degrade gracefully: real-time updates pause, the page stays.
  // Only query/mutation auth failures indicate a genuinely expired session.
  onError(error: CombinedError, operation: Operation) {
    // Log network errors for devtools visibility (never exposed to UI)
    if (error.networkError) {
      const opDef = operation.query.definitions.find(
        (d) => d.kind === 'OperationDefinition'
      ) as { name?: { value: string } } | undefined;
      const opName = opDef?.name?.value ?? 'unknown';
      console.warn(
        `[GraphQL][Network] ${operation.kind} "${opName}": ${error.networkError.message}`
      );
    }

    if (operation.kind === 'subscription') {
      if (hasAuthError(error)) {
        const opDef = operation.query.definitions.find(
          (d) => d.kind === 'OperationDefinition'
        ) as { name?: { value: string } } | undefined;
        const opName = opDef?.name?.value ?? 'unknown';
        if (!_warnedSubscriptionOps.has(opName)) {
          _warnedSubscriptionOps.add(opName);
          console.warn(
            '[Auth] Subscription auth error — degrading gracefully (real-time updates paused).',
            error.message
          );
        }
      }
      return;
    }
    if (
      hasAuthError(error) &&
      isAuthenticated() &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login')
    ) {
      console.error(
        '[Auth] GraphQL Unauthorized — session expired, redirecting to login.',
        error.message
      );
      logout();
    }
  },
});

// ─── WebSocket client ─────────────────────────────────────────────────────────

const wsClient = createWsClient({
  url:
    import.meta.env.VITE_GRAPHQL_WS_URL ??
    import.meta.env.VITE_GRAPHQL_URL.replace(/^http/, 'ws'),
  connectionParams: () => {
    const token = getToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  },
});

// ─── Persisted queries exchange (production only) ─────────────────────────────
// Enabled only when VITE_APQ_ENABLED is explicitly set to "true".
// This prevents the exchange from firing in environments where the gateway
// has no persisted-query manifest (e.g. Docker `vite preview` without APQ
// setup), which previously caused every query to fail with "Must provide
// query string" — the root cause of BUG-039 recurrences.
//
// When APQ IS enabled, generateHash is used on the first request; if the
// gateway responds with PersistedQueryNotFound the exchange automatically
// retries with the full query document (standard APQ protocol).
const apqEnabled =
  import.meta.env.VITE_APQ_ENABLED === 'true';

const maybePersistedExchange = apqEnabled
  ? [
      persistedExchange({
        preferGetForPersistedQueries: true,
        enableForMutation: false,
      }),
    ]
  : [];

export const urqlClient = createClient({
  url: import.meta.env.VITE_GRAPHQL_URL,
  exchanges: [
    cacheExchange({
      keys: {
        PageInfo: () => null,
        UserPreferences: () => null,
        PresignedUploadUrl: () => null,
        CourseProgress: (data) =>
          (data as { courseId?: string }).courseId ?? null,
      },
    }),
    authErrorExchange,
    subscriptionExchange({
      forwardSubscription(request) {
        const input = { ...request, query: request.query ?? '' };
        return {
          subscribe(sink) {
            const unsubscribe = wsClient.subscribe(input, sink);
            return { unsubscribe };
          },
        };
      },
    }),
    ...maybePersistedExchange,
    fetchExchange,
  ],
  fetchOptions: () => {
    const token = getToken();
    return {
      headers: {
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  },
});

export function disposeWsClient(): void {
  wsClient.dispose();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    wsClient.dispose();
  });
}
