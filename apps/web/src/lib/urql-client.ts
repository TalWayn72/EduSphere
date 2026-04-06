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

// BUG-redirect-loop: Track the last time the user successfully logged in.
// After a Keycloak redirect the JWT token arrives fresh but subgraph containers
// may have a stale JWKS cache or the token is not yet propagated. We suppress
// auth-error-triggered logout for 30 seconds after login to prevent the race
// condition where the app logs the user out immediately after they log in.
// The timestamp is set by App.tsx bootstrap() when isAuthenticated() is true.
export const AUTH_LOGIN_TIMESTAMP_KEY = 'edusphere_auth_login_ts';
const AUTH_GRACE_PERIOD_MS = 30_000; // 30 seconds grace after login

function isInLoginGracePeriod(): boolean {
  const ts = window.sessionStorage.getItem(AUTH_LOGIN_TIMESTAMP_KEY);
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < AUTH_GRACE_PERIOD_MS;
}

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
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console -- DEV-only GraphQL network error trace
        console.debug(
          `[GraphQL][Network] ${operation.kind} "${opName}": ${error.networkError.message}`
        );
      }
    }

    if (operation.kind === 'subscription') {
      if (hasAuthError(error)) {
        const opDef = operation.query.definitions.find(
          (d) => d.kind === 'OperationDefinition'
        ) as { name?: { value: string } } | undefined;
        const opName = opDef?.name?.value ?? 'unknown';
        if (!_warnedSubscriptionOps.has(opName)) {
          _warnedSubscriptionOps.add(opName);
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console -- DEV-only subscription auth degradation trace
            console.debug(
              '[Auth] Subscription auth error — degrading gracefully (real-time updates paused).',
              error.message
            );
          }
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
      // BUG-redirect-loop: Do NOT logout immediately after login.
      // The first GraphQL requests after a Keycloak redirect may fail with
      // Unauthenticated if subgraph JWKS caches haven't refreshed yet.
      // Suppress logout for 30 seconds after login to avoid the redirect loop.
      if (isInLoginGracePeriod()) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console -- DEV-only grace period trace
          console.debug(
            '[Auth] GraphQL Unauthorized within login grace period — suppressing logout.',
            error.message
          );
        }
        return;
      }
      console.error(
        '[Auth] GraphQL Unauthorized — session expired, redirecting to login.',
        error.message
      );
      logout();
    }
  },
});

// ─── WebSocket client ─────────────────────────────────────────────────────────

// BUG-fix: WebSocket connection failures — cap reconnect attempts and use
// lazy connection to avoid hammering the gateway when WS is unavailable.
// `lazy: true` delays connection until the first subscription is executed.
// `shouldRetry` limits attempts so the browser console is not flooded with
// rapid-fire "WebSocket connection failed" errors during development.
const WS_MAX_RETRIES = 5;
let _wsRetryCount = 0;

const wsClient = createWsClient({
  url:
    import.meta.env.VITE_GRAPHQL_WS_URL ??
    (import.meta.env.VITE_GRAPHQL_URL
      ? import.meta.env.VITE_GRAPHQL_URL.replace(/^http/, 'ws')
      : 'ws://localhost:4000/graphql'),
  lazy: true,
  shouldRetry: () => {
    _wsRetryCount += 1;
    if (_wsRetryCount > WS_MAX_RETRIES) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console -- DEV-only WS retry cap trace
        console.debug(
          `[WS] Capped reconnect attempts at ${WS_MAX_RETRIES} — real-time updates paused.`
        );
      }
      return false;
    }
    return true;
  },
  on: {
    connected: () => {
      // Reset the retry counter on successful connection
      _wsRetryCount = 0;
    },
  },
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
const apqEnabled = import.meta.env.VITE_APQ_ENABLED === 'true';

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
        TenantBranding: () => null,
        TenantLanguageSettings: () => null,
        PublicTenantBranding: () => null,
        BrandedLoginData: () => null,
        CourseProgress: (data) =>
          (data as { courseId?: string }).courseId ?? null,
        // BUG-fix: types without id fields must be mapped to null to suppress
        // urql graphcache "Invalid key" warnings. These types have no natural
        // cache key — they are always fetched as sub-objects of a parent.
        CourseReadiness: () => null,
        CourseReadinessCheck: () => null,
        RelatedConcept: () => null,
        ConceptRelationship: () => null,
        ConceptNode: () => null,
        LearningPath: () => null,
        SemanticResult: () => null,
        SkillTreeEdge: () => null,
        SkillTree: () => null,
        SkillTreeNode: () => null,
        AdaptiveLearningPath: () => null,
        AdaptivePathItem: () => null,
        AutoPath: () => null,
        AutoPathNode: () => null,
        UserMasteryTopic: () => null,
        SkillGapItem: () => null,
        SkillGapReport: () => null,
        SkillProfile: () => null,
        SocialRecommendation: () => null,
        SocialFeedItem: () => null,
      },
      updates: {
        Mutation: {
          // BUG-103: Invalidate the courses list cache after a course is deleted
          // so the soft-deleted course no longer appears in the UI.
          deleteCourse(_result, _args, cache) {
            cache.invalidate('Query', 'courses', { limit: 50, offset: 0 });
            cache.invalidate('Query', 'courses');
          },
          createCourse(_result, _args, cache) {
            cache.invalidate('Query', 'courses', { limit: 50, offset: 0 });
            cache.invalidate('Query', 'courses');
          },
        },
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
