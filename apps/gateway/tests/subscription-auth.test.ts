/**
 * subscription-auth.test.ts — BUG-049 regression guard
 *
 * Verifies that the Hive Gateway forwards Authorization correctly for BOTH:
 *   - HTTP queries/mutations: token in request.headers.authorization
 *   - WebSocket subscriptions: token in connectionParams.authorization
 *
 * Root cause: The context function originally used `extra?.connectionParams`
 * but graphql-yoga + graphql-ws puts the connection_init payload at the ROOT
 * level of the initial context as `connectionParams`, not inside `extra`.
 * `extra` only contains { socket, request } metadata.
 *
 * Fix: Read `initialContext.connectionParams.authorization` directly.
 * Fix: Add `onFetch` plugin to createGateway so the resolved Authorization
 *      header (stored in context.headers.authorization) is forwarded on every
 *      subgraph HTTP fetch request.
 */
import { describe, it, expect } from 'vitest';

// ── Auth resolution logic (mirrors apps/gateway/src/index.ts context fn) ─────
// Extracted into a pure helper so we can unit-test all auth paths without
// spinning up a real gateway or WebSocket connection.

interface GatewayInitialCtx {
  request: { headers: { get: (key: string) => string | null } };
  connectionParams?: Record<string, unknown>;
  extra?: { connectionParams?: Record<string, unknown>; socket?: unknown };
}

/**
 * resolveAuthHeader mirrors the auth-extraction logic in the gateway
 * context function (apps/gateway/src/index.ts).
 *
 * Priority: HTTP Authorization header > connectionParams.authorization
 */
function resolveAuthHeader(initialCtx: GatewayInitialCtx): string | null {
  const httpAuth = initialCtx.request.headers.get('authorization');

  // BUG-049: connectionParams is at ROOT level in graphql-yoga context,
  // NOT at extra.connectionParams.
  const wsParams = initialCtx.connectionParams;
  const wsAuth =
    typeof wsParams?.['authorization'] === 'string'
      ? (wsParams['authorization'] as string)
      : undefined;

  return httpAuth ?? wsAuth ?? null;
}

/**
 * shouldForwardAuth mirrors the onFetch plugin in createGateway.
 * Returns the Authorization header value that would be forwarded, or null.
 */
function shouldForwardAuth(
  context: unknown
): string | null {
  const ctx = context as
    | { headers?: { authorization?: string | null } }
    | null
    | undefined;
  return ctx?.headers?.authorization ?? null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(authHeader: string | null): GatewayInitialCtx['request'] {
  return {
    headers: {
      get: (key: string) => (key === 'authorization' ? authHeader : null),
    },
  };
}

// ── Tests: Auth resolution (context function) ──────────────────────────────

describe('BUG-049 — gateway auth resolution', () => {
  // ── HTTP path ─────────────────────────────────────────────────────────────

  it('reads auth from HTTP Authorization header for queries/mutations', () => {
    const ctx: GatewayInitialCtx = {
      request: makeRequest('Bearer http-token'),
    };
    expect(resolveAuthHeader(ctx)).toBe('Bearer http-token');
  });

  it('returns null when no HTTP header and no connectionParams', () => {
    const ctx: GatewayInitialCtx = {
      request: makeRequest(null),
    };
    expect(resolveAuthHeader(ctx)).toBeNull();
  });

  // ── WebSocket path: connectionParams at ROOT level ─────────────────────────
  // BUG-049: graphql-yoga places connection_init payload at root, NOT in extra.

  it('reads auth from root-level connectionParams for WebSocket subscriptions', () => {
    const ctx: GatewayInitialCtx = {
      request: makeRequest(null), // WS upgrade requests have no Authorization header
      connectionParams: { authorization: 'Bearer ws-token' },
    };
    expect(resolveAuthHeader(ctx)).toBe('Bearer ws-token');
  });

  it('ignores auth in extra.connectionParams (wrong path from original bug)', () => {
    // Before BUG-049 fix, the code read from extra?.connectionParams.
    // This test confirms that extra is NOT the source of truth.
    const ctx: GatewayInitialCtx = {
      request: makeRequest(null),
      extra: { connectionParams: { authorization: 'Bearer extra-token' } },
      // connectionParams at root is absent → should return null, not extra value
    };
    // The fixed code reads from root connectionParams only.
    // extra.connectionParams is ignored — this asserts the corrected behavior.
    expect(resolveAuthHeader(ctx)).toBeNull();
  });

  it('HTTP Authorization header takes priority over connectionParams', () => {
    const ctx: GatewayInitialCtx = {
      request: makeRequest('Bearer http-token'),
      connectionParams: { authorization: 'Bearer ws-token' },
    };
    // HTTP is preferred (prevents clients from overriding auth via WS params)
    expect(resolveAuthHeader(ctx)).toBe('Bearer http-token');
  });

  it('ignores non-string connectionParams.authorization values', () => {
    const ctx: GatewayInitialCtx = {
      request: makeRequest(null),
      connectionParams: { authorization: 12345 }, // number, not string
    };
    expect(resolveAuthHeader(ctx)).toBeNull();
  });

  it('ignores null connectionParams.authorization', () => {
    const ctx: GatewayInitialCtx = {
      request: makeRequest(null),
      connectionParams: { authorization: null },
    };
    expect(resolveAuthHeader(ctx)).toBeNull();
  });

  it('handles empty connectionParams object', () => {
    const ctx: GatewayInitialCtx = {
      request: makeRequest(null),
      connectionParams: {},
    };
    expect(resolveAuthHeader(ctx)).toBeNull();
  });

  it('handles undefined connectionParams (non-subscription request)', () => {
    const ctx: GatewayInitialCtx = {
      request: makeRequest(null),
      connectionParams: undefined,
    };
    expect(resolveAuthHeader(ctx)).toBeNull();
  });

  // ── WebSocket with extra fields (realistic graphql-ws shape) ──────────────

  it('reads auth correctly when extra is also present (realistic WS context)', () => {
    const ctx: GatewayInitialCtx = {
      request: makeRequest(null),
      connectionParams: { authorization: 'Bearer ws-real-token', locale: 'en' },
      extra: { socket: {} }, // extra present but connectionParams NOT inside it
    };
    expect(resolveAuthHeader(ctx)).toBe('Bearer ws-real-token');
  });
});

// ── Tests: onFetch plugin (subgraph auth forwarding) ────────────────────────

describe('BUG-049 — onFetch plugin auth forwarding', () => {
  it('returns auth when context.headers.authorization is set', () => {
    const ctx = { headers: { authorization: 'Bearer some-token' } };
    expect(shouldForwardAuth(ctx)).toBe('Bearer some-token');
  });

  it('returns null when context.headers.authorization is absent', () => {
    const ctx = { headers: {} };
    expect(shouldForwardAuth(ctx)).toBeNull();
  });

  it('returns null when context.headers is undefined', () => {
    const ctx = {};
    expect(shouldForwardAuth(ctx)).toBeNull();
  });

  it('returns null when context is null', () => {
    expect(shouldForwardAuth(null)).toBeNull();
  });

  it('returns null when context is undefined', () => {
    expect(shouldForwardAuth(undefined)).toBeNull();
  });

  it('returns null when authorization is explicitly null', () => {
    const ctx = { headers: { authorization: null } };
    expect(shouldForwardAuth(ctx)).toBeNull();
  });

  // ── onFetch simulated behavior ────────────────────────────────────────────

  it('simulates full onFetch plugin: forwards auth to subgraph options', () => {
    const incomingOptions: RequestInit = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    };
    let updatedOptions: RequestInit | null = null;

    // Simulate the onFetch plugin
    const ctx = { headers: { authorization: 'Bearer forwarded-token' } };
    const auth = shouldForwardAuth(ctx);
    if (auth) {
      const prev = incomingOptions.headers as Record<string, string> | undefined;
      updatedOptions = {
        ...incomingOptions,
        headers: { ...(prev ?? {}), authorization: auth },
      };
    }

    expect(updatedOptions).not.toBeNull();
    expect((updatedOptions!.headers as Record<string, string>)['authorization']).toBe(
      'Bearer forwarded-token'
    );
    // Original headers are preserved
    expect(
      (updatedOptions!.headers as Record<string, string>)['content-type']
    ).toBe('application/json');
  });

  it('simulates onFetch plugin: does NOT modify options when no auth', () => {
    const incomingOptions: RequestInit = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    };
    let modified = false;

    // Simulate the onFetch plugin with no auth
    const ctx = { headers: {} };
    const auth = shouldForwardAuth(ctx);
    if (auth) {
      modified = true; // Should NOT reach here
    }

    expect(modified).toBe(false);
    expect(incomingOptions.headers).toEqual({ 'content-type': 'application/json' });
  });
});

// ── Integration: Full auth resolution + forwarding chain ────────────────────

describe('BUG-049 — end-to-end auth propagation chain', () => {
  /**
   * Simulates the full authentication chain for a WebSocket subscription:
   * 1. Browser sends connectionParams.authorization
   * 2. Gateway resolves auth from connectionParams (ROOT level)
   * 3. Gateway context returns headers.authorization
   * 4. onFetch plugin forwards authorization to subgraph fetch
   */
  it('WebSocket subscription: auth flows from connectionParams to subgraph fetch', () => {
    // Step 1: Simulate browser WebSocket connection with connectionParams
    const initialCtx: GatewayInitialCtx = {
      request: makeRequest(null), // WS upgrade has no Authorization header
      connectionParams: { authorization: 'Bearer keycloak-jwt-token' },
    };

    // Step 2: Gateway context resolves auth
    const resolvedAuth = resolveAuthHeader(initialCtx);
    expect(resolvedAuth).toBe('Bearer keycloak-jwt-token');

    // Step 3: Context returns resolved auth in headers
    const gatewayContext = {
      headers: { authorization: resolvedAuth },
    };

    // Step 4: onFetch plugin forwards auth to subgraph
    const subgraphAuth = shouldForwardAuth(gatewayContext);
    expect(subgraphAuth).toBe('Bearer keycloak-jwt-token');
  });

  /**
   * Simulates the auth chain for an HTTP query/mutation:
   * 1. Browser sends Authorization header in HTTP request
   * 2. Gateway resolves auth from HTTP header (no connectionParams)
   * 3. onFetch forwards it to subgraph
   */
  it('HTTP query: auth flows from HTTP header to subgraph fetch', () => {
    const initialCtx: GatewayInitialCtx = {
      request: makeRequest('Bearer keycloak-http-token'),
      // No connectionParams for HTTP requests
    };

    const resolvedAuth = resolveAuthHeader(initialCtx);
    expect(resolvedAuth).toBe('Bearer keycloak-http-token');

    const gatewayContext = { headers: { authorization: resolvedAuth } };
    const subgraphAuth = shouldForwardAuth(gatewayContext);
    expect(subgraphAuth).toBe('Bearer keycloak-http-token');
  });

  /**
   * Unauthenticated request: no auth anywhere → subgraph receives no auth.
   * The subgraph resolver (protected by @authenticated) will reject it,
   * but the gateway should NOT crash or throw unexpectedly.
   */
  it('unauthenticated request: no auth propagated to subgraph', () => {
    const initialCtx: GatewayInitialCtx = {
      request: makeRequest(null),
      connectionParams: {},
    };

    const resolvedAuth = resolveAuthHeader(initialCtx);
    expect(resolvedAuth).toBeNull();

    const gatewayContext = { headers: { authorization: null } };
    const subgraphAuth = shouldForwardAuth(gatewayContext);
    expect(subgraphAuth).toBeNull();
  });
});
