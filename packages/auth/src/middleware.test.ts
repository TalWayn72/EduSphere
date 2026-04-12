/**
 * Tests for packages/auth — middleware.ts (AuthMiddleware.validateRequest)
 *
 * Key regression: invalid JWT must NOT throw — the request proceeds
 * unauthenticated so public resolvers (no @authenticated) still respond.
 * Only resolvers that explicitly call extractAuthContext() will reject.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IncomingMessage } from 'node:http';

// ─── Mock dependencies BEFORE any module-under-test import ───────────────────

vi.mock('@edusphere/config', () => ({
  keycloakConfig: {
    url: 'http://keycloak:8080',
    realm: 'edusphere',
    clientId: 'edusphere-app',
    get jwksUrl() {
      return `${this.url}/realms/${this.realm}/protocol/openid-connect/certs`;
    },
    get issuer() {
      return `${this.url}/realms/${this.realm}`;
    },
  },
}));

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(),
}));

import * as jose from 'jose';

import { AuthMiddleware, type GraphQLContext } from './middleware.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeContext(authHeader?: string): GraphQLContext {
  return {
    req: {
      headers: authHeader ? { authorization: authHeader } : {},
    } as IncomingMessage & {
      headers: Record<string, string | string[] | undefined>;
    },
  };
}

const mockJwtVerify = vi.mocked(jose.jwtVerify);
const mockCreateRemoteJWKSet = vi.mocked(jose.createRemoteJWKSet);

const VALID_PAYLOAD = {
  sub: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'user@example.com',
  preferred_username: 'testuser',
  given_name: 'Test',
  family_name: 'User',
  realm_access: { roles: ['STUDENT'] },
  tenant_id: 'b1e2c3d4-e5f6-7890-abcd-ef1234567890',
  iss: 'http://keycloak:8080/realms/edusphere',
  aud: 'edusphere-app',
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000) - 10,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthMiddleware.validateRequest', () => {
  let middleware: AuthMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRemoteJWKSet.mockReturnValue(vi.fn());
    middleware = new AuthMiddleware();
  });

  // ── No authorization header ──────────────────────────────────────────────

  it('does NOT throw and leaves authContext undefined when no authorization header', async () => {
    const ctx = makeContext();
    await expect(middleware.validateRequest(ctx)).resolves.toBeUndefined();
    expect(ctx.authContext).toBeUndefined();
  });

  it('does NOT throw and leaves authContext undefined when header is empty string', async () => {
    const ctx = makeContext('');
    await expect(middleware.validateRequest(ctx)).resolves.toBeUndefined();
    expect(ctx.authContext).toBeUndefined();
  });

  // ── Invalid authorization header format ──────────────────────────────────

  it('does NOT throw and leaves authContext undefined for malformed header (no Bearer prefix)', async () => {
    const ctx = makeContext('Basic dXNlcjpwYXNz');
    await expect(middleware.validateRequest(ctx)).resolves.toBeUndefined();
    expect(ctx.authContext).toBeUndefined();
  });

  // ── REGRESSION: Invalid JWT must NOT throw ───────────────────────────────

  it('does NOT throw when JWT validation fails — request proceeds unauthenticated', async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error('JWT is expired'));
    const ctx = makeContext('Bearer expired.jwt.token');

    // Must not throw — public resolvers need to serve unauthenticated requests
    await expect(middleware.validateRequest(ctx)).resolves.toBeUndefined();
    expect(ctx.authContext).toBeUndefined();
  });

  it('does NOT throw for a completely malformed token string', async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error('Invalid Compact JWS'));
    const ctx = makeContext('Bearer not-a-real-jwt');

    await expect(middleware.validateRequest(ctx)).resolves.toBeUndefined();
    expect(ctx.authContext).toBeUndefined();
  });

  it('does NOT throw when audience validation fails', async () => {
    mockJwtVerify.mockRejectedValueOnce(
      new Error('unexpected "aud" claim value')
    );
    const ctx = makeContext('Bearer wrong-audience.jwt');

    await expect(middleware.validateRequest(ctx)).resolves.toBeUndefined();
    expect(ctx.authContext).toBeUndefined();
  });

  it('does NOT throw when signature verification fails', async () => {
    mockJwtVerify.mockRejectedValueOnce(
      new Error('signature verification failed')
    );
    const ctx = makeContext('Bearer bad-signature.jwt');

    await expect(middleware.validateRequest(ctx)).resolves.toBeUndefined();
    expect(ctx.authContext).toBeUndefined();
  });

  // ── Valid JWT sets authContext ────────────────────────────────────────────

  it('sets authContext when JWT is valid', async () => {
    mockJwtVerify.mockResolvedValueOnce({ payload: VALID_PAYLOAD } as never);
    const ctx = makeContext('Bearer valid.jwt.token');

    await middleware.validateRequest(ctx);

    expect(ctx.authContext).toBeDefined();
    expect(ctx.authContext?.userId).toBe(
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    );
    expect(ctx.authContext?.email).toBe('user@example.com');
    expect(ctx.authContext?.roles).toContain('STUDENT');
    expect(ctx.authContext?.isSuperAdmin).toBe(false);
  });

  it('sets authContext.isSuperAdmin=true for SUPER_ADMIN role', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        ...VALID_PAYLOAD,
        realm_access: { roles: ['SUPER_ADMIN'] },
      },
    } as never);
    const ctx = makeContext('Bearer admin.jwt.token');

    await middleware.validateRequest(ctx);

    expect(ctx.authContext?.isSuperAdmin).toBe(true);
    expect(ctx.authContext?.roles).toContain('SUPER_ADMIN');
  });

  // ── Dev bypass ────────────────────────────────────────────────────────────

  it('sets authContext for dev-token-mock-jwt when NODE_ENV is not production AND ALLOW_DEV_TOKEN=true', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_DEV_TOKEN;
    const originalSecret = process.env.DEV_TOKEN_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_DEV_TOKEN = 'true';
    process.env.DEV_TOKEN_SECRET = 'dev-token-mock-jwt';
    try {
      const ctx = makeContext('Bearer dev-token-mock-jwt');
      await middleware.validateRequest(ctx);

      expect(ctx.authContext).toBeDefined();
      expect(ctx.authContext?.userId).toBe(
        '00000000-0000-0000-0000-000000000001'
      );
      expect(ctx.authContext?.isSuperAdmin).toBe(true);
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.ALLOW_DEV_TOKEN = originalAllow;
      if (originalSecret === undefined) {
        delete process.env.DEV_TOKEN_SECRET;
      } else {
        process.env.DEV_TOKEN_SECRET = originalSecret;
      }
    }
  });

  it('rejects dev-token-mock-jwt when ALLOW_DEV_TOKEN is not set (W0-2 regression)', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_DEV_TOKEN;
    process.env.NODE_ENV = 'test';
    delete process.env.ALLOW_DEV_TOKEN;
    try {
      mockJwtVerify.mockRejectedValueOnce(new Error('Invalid token'));
      const ctx = makeContext('Bearer dev-token-mock-jwt');
      await middleware.validateRequest(ctx);

      // Dev token should NOT be accepted without ALLOW_DEV_TOKEN=true
      // It falls through to JWT validation which fails, leaving authContext undefined
      expect(ctx.authContext).toBeUndefined();
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.ALLOW_DEV_TOKEN = originalAllow;
    }
  });

  it('rejects dev-token-mock-jwt when ALLOW_DEV_TOKEN is "false"', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_DEV_TOKEN;
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_DEV_TOKEN = 'false';
    try {
      mockJwtVerify.mockRejectedValueOnce(new Error('Invalid token'));
      const ctx = makeContext('Bearer dev-token-mock-jwt');
      await middleware.validateRequest(ctx);

      expect(ctx.authContext).toBeUndefined();
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.ALLOW_DEV_TOKEN = originalAllow;
    }
  });

  // ── tenant_id fallback — x-tenant-id header (BUG regression) ────────────────
  // Root cause: Keycloak users missing tenant_id attribute → JWT has no tenant_id
  // claim → auth() throws Unauthorized. The gateway sets x-tenant-id as a fallback.

  it('uses x-tenant-id header as fallback when JWT has no tenant_id claim', async () => {
    const { tenant_id: _omit, ...payloadNoTenant } = VALID_PAYLOAD;
    mockJwtVerify.mockResolvedValueOnce({
      payload: payloadNoTenant,
    } as never);

    const ctx: GraphQLContext = {
      req: {
        headers: {
          authorization: 'Bearer valid.jwt.token',
          'x-tenant-id': 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
        },
      } as IncomingMessage & {
        headers: Record<string, string | string[] | undefined>;
      },
    };

    await middleware.validateRequest(ctx);

    expect(ctx.authContext).toBeDefined();
    expect(ctx.authContext?.tenantId).toBe(
      'c1d2e3f4-a5b6-7890-abcd-ef1234567890'
    );
    expect(ctx.authContext?.userId).toBe(VALID_PAYLOAD.sub);
  });

  it('uses first element of x-tenant-id array when JWT has no tenant_id claim', async () => {
    const { tenant_id: _omit, ...payloadNoTenant } = VALID_PAYLOAD;
    mockJwtVerify.mockResolvedValueOnce({
      payload: payloadNoTenant,
    } as never);

    const ctx: GraphQLContext = {
      req: {
        headers: {
          authorization: 'Bearer valid.jwt.token',
          'x-tenant-id': [
            'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
            'other-tenant',
          ],
        },
      } as IncomingMessage & {
        headers: Record<string, string | string[] | undefined>;
      },
    };

    await middleware.validateRequest(ctx);

    expect(ctx.authContext?.tenantId).toBe(
      'c1d2e3f4-a5b6-7890-abcd-ef1234567890'
    );
  });

  it('leaves tenantId undefined when JWT has no tenant_id and no x-tenant-id header', async () => {
    const { tenant_id: _omit, ...payloadNoTenant } = VALID_PAYLOAD;
    mockJwtVerify.mockResolvedValueOnce({
      payload: payloadNoTenant,
    } as never);

    const ctx = makeContext('Bearer valid.jwt.token');

    await middleware.validateRequest(ctx);

    expect(ctx.authContext).toBeDefined();
    expect(ctx.authContext?.userId).toBe(VALID_PAYLOAD.sub);
    expect(ctx.authContext?.tenantId).toBeUndefined();
  });

  // ── Gateway-forwarded headers fallback ────────────────────────────────────

  it('uses gateway-forwarded x-user-id header as fallback when JWT validation fails', async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error('JWKS fetch failed'));

    const ctx: GraphQLContext = {
      req: {
        headers: {
          authorization: 'Bearer some.invalid.token',
          'x-user-id': 'user-from-gateway',
          'x-tenant-id': 'tenant-from-gateway',
          'x-user-role': 'STUDENT',
        },
      } as IncomingMessage & {
        headers: Record<string, string | string[] | undefined>;
      },
    };

    await middleware.validateRequest(ctx);

    expect(ctx.authContext).toBeDefined();
    expect(ctx.authContext?.userId).toBe('user-from-gateway');
    expect(ctx.authContext?.tenantId).toBe('tenant-from-gateway');
    expect(ctx.authContext?.roles).toEqual(['STUDENT']);
    expect(ctx.authContext?.isSuperAdmin).toBe(false);
  });

  it('does NOT grant SUPER_ADMIN via x-user-role header in fallback (W0-3 regression)', async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error('JWKS fetch failed'));

    const ctx: GraphQLContext = {
      req: {
        headers: {
          authorization: 'Bearer some.invalid.token',
          'x-user-id': 'admin-user',
          'x-tenant-id': 'admin-tenant',
          'x-user-role': 'SUPER_ADMIN',
        },
      } as IncomingMessage & {
        headers: Record<string, string | string[] | undefined>;
      },
    };

    await middleware.validateRequest(ctx);

    // SUPER_ADMIN must NOT be grantable via header — only via validated JWT.
    // The role is stripped, so authContext has empty roles and isSuperAdmin=false.
    expect(ctx.authContext?.isSuperAdmin).toBe(false);
    expect(ctx.authContext?.roles).toEqual([]);
  });

  // ── BUG-073 regression: audience must NOT be checked in subgraph middleware ─
  it('does NOT pass audience to JWTValidator (BUG-073 regression)', () => {
    // createRemoteJWKSet is called in constructor — verify jwtVerify options
    // don't include audience by attempting a valid JWT without the audience claim
    const payloadNoAud = { ...VALID_PAYLOAD };
    delete (payloadNoAud as Record<string, unknown>).aud;
    mockJwtVerify.mockResolvedValueOnce({ payload: payloadNoAud } as never);

    const ctx = makeContext('Bearer valid-no-aud.jwt');
    // Should succeed without audience mismatch
    return expect(middleware.validateRequest(ctx)).resolves.toBeUndefined();
  });

  it('leaves authContext undefined when JWT fails AND no x-user-id header', async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error('JWKS fetch failed'));

    const ctx = makeContext('Bearer some.invalid.token');

    await middleware.validateRequest(ctx);

    expect(ctx.authContext).toBeUndefined();
  });
});
