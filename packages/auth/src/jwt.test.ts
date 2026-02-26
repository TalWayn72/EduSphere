/**
 * Comprehensive tests for packages/auth — jwt.ts
 *
 * Coverage targets:
 *   - JWTValidator.validate()     — valid / expired / malformed / wrong-sig / missing-claims
 *   - JWTValidator.extractToken() — Bearer parsing
 *   - requireRole()               — success, SUPER_ADMIN bypass, forbidden, no context
 *   - requireAnyRole()            — success, SUPER_ADMIN bypass, forbidden, no context
 *   - requireTenantAccess()       — success, SUPER_ADMIN bypass, mismatch, no context
 *   - JWTClaimsSchema / UserRole  — Zod validation edge cases
 *
 * NOTE: vi.mock() is hoisted by Vitest above all variable declarations.
 * The factory MUST NOT reference variables declared in the test file scope.
 * Use vi.fn() inline inside the factory; retrieve the mocks via vi.mocked() after import.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock jose BEFORE any import of the module under test ────────────────────
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(),
}));

// ─── Now import jose so we can retrieve the mocked functions ─────────────────
import * as jose from 'jose';

// ─── Import the module under test ────────────────────────────────────────────
import {
  JWTValidator,
  UserRole,
  JWTClaimsSchema,
  requireRole,
  requireAnyRole,
  requireTenantAccess,
  type AuthContext,
  type JWTClaims,
} from './jwt.js';

// ─── Typed references to the mocked functions ────────────────────────────────
const mockJwtVerify = vi.mocked(jose.jwtVerify);
const mockCreateRemoteJWKSet = vi.mocked(jose.createRemoteJWKSet);

// ═══════════════════════════════════════════════════════════════
// Shared fixtures
// ═══════════════════════════════════════════════════════════════

const TENANT_ID = 'b1e2c3d4-e5f6-7890-abcd-ef1234567890';
const USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const KEYCLOAK_URL = 'http://keycloak:8080';
const REALM = 'edusphere';
const CLIENT_ID = 'edusphere-app';

/** Build a valid JWT payload (all required fields present) */
function makePayload(overrides: Partial<JWTClaims> = {}): JWTClaims {
  return {
    sub: USER_ID,
    email: 'user@example.com',
    preferred_username: 'testuser',
    given_name: 'Test',
    family_name: 'User',
    realm_access: { roles: ['STUDENT'] },
    tenant_id: TENANT_ID,
    iss: `${KEYCLOAK_URL}/realms/${REALM}`,
    aud: CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000) - 10,
    ...overrides,
  };
}

const STUDENT_CTX: AuthContext = {
  userId: USER_ID,
  email: 'user@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  roles: ['STUDENT'],
  scopes: [],
  tenantId: TENANT_ID,
  isSuperAdmin: false,
};

const INSTRUCTOR_CTX: AuthContext = {
  ...STUDENT_CTX,
  roles: ['INSTRUCTOR'],
};

const SUPER_ADMIN_CTX: AuthContext = {
  ...STUDENT_CTX,
  roles: ['SUPER_ADMIN'],
  isSuperAdmin: true,
};

// ═══════════════════════════════════════════════════════════════
// JWTValidator
// ═══════════════════════════════════════════════════════════════

describe('JWTValidator', () => {
  // Fake JWKS callable returned by createRemoteJWKSet
  const fakeJwks = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRemoteJWKSet.mockReturnValue(fakeJwks);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Constructor ───────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('calls createRemoteJWKSet with the correct JWKS URL', () => {
      new JWTValidator(KEYCLOAK_URL, REALM, CLIENT_ID);

      expect(mockCreateRemoteJWKSet).toHaveBeenCalledOnce();
      const url: URL = mockCreateRemoteJWKSet.mock.calls[0][0] as URL;
      expect(url.toString()).toBe(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`
      );
    });

    it('constructs without throwing for valid arguments', () => {
      expect(
        () => new JWTValidator(KEYCLOAK_URL, REALM, CLIENT_ID)
      ).not.toThrow();
    });
  });

  // ─── validate() — happy path ───────────────────────────────────────────────

  describe('validate() — valid token', () => {
    let validator: JWTValidator;

    beforeEach(() => {
      validator = new JWTValidator(KEYCLOAK_URL, REALM, CLIENT_ID);
    });

    it('returns a correctly shaped AuthContext for a STUDENT token', async () => {
      mockJwtVerify.mockResolvedValueOnce({ payload: makePayload() } as never);

      const ctx = await validator.validate('valid.jwt.token');

      expect(ctx.userId).toBe(USER_ID);
      expect(ctx.email).toBe('user@example.com');
      expect(ctx.username).toBe('testuser');
      expect(ctx.firstName).toBe('Test');
      expect(ctx.lastName).toBe('User');
      expect(ctx.roles).toEqual(['STUDENT']);
      expect(ctx.scopes).toEqual([]);
      expect(ctx.tenantId).toBe(TENANT_ID);
      expect(ctx.isSuperAdmin).toBe(false);
    });

    it('sets isSuperAdmin=true when realm_access contains SUPER_ADMIN', async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: makePayload({
          realm_access: { roles: ['SUPER_ADMIN', 'STUDENT'] },
        }),
      } as never);

      const ctx = await validator.validate('admin.token');

      expect(ctx.isSuperAdmin).toBe(true);
      expect(ctx.roles).toContain('SUPER_ADMIN');
    });

    it('filters out Keycloak system roles not in the UserRole enum', async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: makePayload({
          realm_access: {
            roles: ['STUDENT', 'offline_access', 'uma_authorization'],
          },
        }),
      } as never);

      const ctx = await validator.validate('token-with-extra-roles');

      expect(ctx.roles).toEqual(['STUDENT']);
    });

    it('preserves multiple valid roles', async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: makePayload({
          realm_access: { roles: ['INSTRUCTOR', 'RESEARCHER'] },
        }),
      } as never);

      const ctx = await validator.validate('multi-role.token');

      expect(ctx.roles).toContain('INSTRUCTOR');
      expect(ctx.roles).toContain('RESEARCHER');
      expect(ctx.roles).toHaveLength(2);
    });

    it('handles absent optional fields (given_name / family_name / tenant_id)', async () => {
      const {
        given_name: _gn,
        family_name: _fn,
        tenant_id: _tid,
        ...rest
      } = makePayload();
      mockJwtVerify.mockResolvedValueOnce({ payload: rest } as never);

      const ctx = await validator.validate('minimal.token');

      expect(ctx.firstName).toBeUndefined();
      expect(ctx.lastName).toBeUndefined();
      expect(ctx.tenantId).toBeUndefined();
    });

    it('passes correct issuer and audience to jwtVerify', async () => {
      mockJwtVerify.mockResolvedValueOnce({ payload: makePayload() } as never);

      await validator.validate('some.token');

      expect(mockJwtVerify).toHaveBeenCalledWith('some.token', fakeJwks, {
        issuer: `${KEYCLOAK_URL}/realms/${REALM}`,
        audience: CLIENT_ID,
      });
    });

    it('omits audience from jwtVerify when clientId is not provided', async () => {
      const noAudValidator = new JWTValidator(KEYCLOAK_URL, REALM);
      mockJwtVerify.mockResolvedValueOnce({ payload: makePayload() } as never);

      await noAudValidator.validate('some.token');

      expect(mockJwtVerify).toHaveBeenCalledWith('some.token', fakeJwks, {
        issuer: `${KEYCLOAK_URL}/realms/${REALM}`,
      });
    });

    it('passes the JWKS function object as the key material to jwtVerify', async () => {
      mockJwtVerify.mockResolvedValueOnce({ payload: makePayload() } as never);

      await validator.validate('tok');

      expect(mockJwtVerify.mock.calls[0][1]).toBe(fakeJwks);
    });

    it('returns scopes as an empty array (not undefined)', async () => {
      mockJwtVerify.mockResolvedValueOnce({ payload: makePayload() } as never);

      const ctx = await validator.validate('tok');

      expect(Array.isArray(ctx.scopes)).toBe(true);
      expect(ctx.scopes).toHaveLength(0);
    });

    it('accepts audience as an array in JWT claims', async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: makePayload({ aud: [CLIENT_ID, 'account'] }),
      } as never);

      const ctx = await validator.validate('multi-aud.token');

      expect(ctx.userId).toBe(USER_ID);
    });
  });

  // ─── validate() — error paths ──────────────────────────────────────────────

  describe('validate() — invalid / expired / malformed tokens', () => {
    let validator: JWTValidator;

    beforeEach(() => {
      validator = new JWTValidator(KEYCLOAK_URL, REALM, CLIENT_ID);
    });

    it('throws "JWT validation failed: JWT is expired" for an expired token', async () => {
      mockJwtVerify.mockRejectedValueOnce(new Error('JWT is expired'));

      await expect(validator.validate('expired.jwt')).rejects.toThrow(
        'JWT validation failed: JWT is expired'
      );
    });

    it('throws "JWT validation failed: signature verification failed" for bad signature', async () => {
      mockJwtVerify.mockRejectedValueOnce(
        new Error('signature verification failed')
      );

      await expect(validator.validate('bad-sig.jwt')).rejects.toThrow(
        'JWT validation failed: signature verification failed'
      );
    });

    it('throws "JWT validation failed" for a completely malformed token string', async () => {
      mockJwtVerify.mockRejectedValueOnce(new Error('Invalid Compact JWS'));

      await expect(validator.validate('not-a-jwt')).rejects.toThrow(
        'JWT validation failed: Invalid Compact JWS'
      );
    });

    it('wraps a non-Error rejection in the generic "JWT validation failed" message', async () => {
      // jose can throw non-Error objects in edge cases
      mockJwtVerify.mockRejectedValueOnce('raw string error');

      await expect(validator.validate('weird.jwt')).rejects.toThrow(
        'JWT validation failed'
      );
    });

    it('throws when claims fail Zod validation — sub is not a UUID', async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: makePayload({ sub: 'not-a-uuid' }),
      } as never);

      await expect(validator.validate('bad-sub.jwt')).rejects.toThrow(
        'JWT validation failed'
      );
    });

    it('throws when email claim is missing', async () => {
      const { email: _em, ...noEmail } = makePayload();
      mockJwtVerify.mockResolvedValueOnce({ payload: noEmail } as never);

      await expect(validator.validate('no-email.jwt')).rejects.toThrow(
        'JWT validation failed'
      );
    });

    it('throws when email is not a valid email address', async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: makePayload({ email: 'not-an-email' }),
      } as never);

      await expect(validator.validate('bad-email.jwt')).rejects.toThrow(
        'JWT validation failed'
      );
    });

    it('throws when preferred_username is missing', async () => {
      const { preferred_username: _u, ...noUsername } = makePayload();
      mockJwtVerify.mockResolvedValueOnce({ payload: noUsername } as never);

      await expect(validator.validate('no-username.jwt')).rejects.toThrow(
        'JWT validation failed'
      );
    });

    it('throws when realm_access is absent', async () => {
      const { realm_access: _ra, ...noRealm } = makePayload();
      mockJwtVerify.mockResolvedValueOnce({ payload: noRealm } as never);

      await expect(validator.validate('no-realm.jwt')).rejects.toThrow(
        'JWT validation failed'
      );
    });

    it('throws when tenant_id is present but not a valid UUID', async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: makePayload({ tenant_id: 'not-a-uuid' }),
      } as never);

      await expect(validator.validate('bad-tenant.jwt')).rejects.toThrow(
        'JWT validation failed'
      );
    });
  });

  // ─── extractToken() ────────────────────────────────────────────────────────

  describe('extractToken()', () => {
    let validator: JWTValidator;

    beforeEach(() => {
      validator = new JWTValidator(KEYCLOAK_URL, REALM, CLIENT_ID);
    });

    it('extracts the token from a valid "Bearer <token>" header', () => {
      expect(validator.extractToken('Bearer my.jwt.token')).toBe(
        'my.jwt.token'
      );
    });

    it('returns null when authHeader is undefined', () => {
      expect(validator.extractToken(undefined)).toBeNull();
    });

    it('returns null when authHeader is an empty string', () => {
      expect(validator.extractToken('')).toBeNull();
    });

    it('returns null when header uses Basic scheme instead of Bearer', () => {
      expect(validator.extractToken('Basic dXNlcjpwYXNz')).toBeNull();
    });

    it('returns null when header is lowercase "bearer "', () => {
      expect(validator.extractToken('bearer lowercase.token')).toBeNull();
    });

    it('preserves dots, hyphens, and underscores in the extracted token', () => {
      const token = 'eyJhbGc.eyJzdWIiOiJ.SflKxwRJSMeKKF2QT4f';
      expect(validator.extractToken(`Bearer ${token}`)).toBe(token);
    });

    it('returns empty string when header is exactly "Bearer " with no token after it', () => {
      // substring(7) of "Bearer " returns ""
      expect(validator.extractToken('Bearer ')).toBe('');
    });

    it('handles a very long token without truncation', () => {
      const longToken = 'a'.repeat(2000);
      expect(validator.extractToken(`Bearer ${longToken}`)).toBe(longToken);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// requireRole()
// ═══════════════════════════════════════════════════════════════

describe('requireRole()', () => {
  it('does NOT throw when context has the required role', () => {
    expect(() => requireRole(STUDENT_CTX, 'STUDENT')).not.toThrow();
  });

  it('does NOT throw when context is SUPER_ADMIN — bypasses role check', () => {
    expect(() => requireRole(SUPER_ADMIN_CTX, 'INSTRUCTOR')).not.toThrow();
    expect(() => requireRole(SUPER_ADMIN_CTX, 'ORG_ADMIN')).not.toThrow();
    expect(() => requireRole(SUPER_ADMIN_CTX, 'RESEARCHER')).not.toThrow();
  });

  it('throws Forbidden when context lacks the required role', () => {
    expect(() => requireRole(STUDENT_CTX, 'INSTRUCTOR')).toThrow(
      'Forbidden: Role INSTRUCTOR required'
    );
  });

  it('throws Forbidden for a different valid role', () => {
    expect(() => requireRole(INSTRUCTOR_CTX, 'ORG_ADMIN')).toThrow(
      'Forbidden: Role ORG_ADMIN required'
    );
  });

  it('throws Unauthorized when context is null', () => {
    expect(() => requireRole(null, 'STUDENT')).toThrow(
      'Unauthorized: No authentication context'
    );
  });

  it('allows INSTRUCTOR access to INSTRUCTOR-required resource', () => {
    expect(() => requireRole(INSTRUCTOR_CTX, 'INSTRUCTOR')).not.toThrow();
  });

  it('error message includes the name of the missing role', () => {
    try {
      requireRole(STUDENT_CTX, 'ORG_ADMIN');
    } catch (err) {
      expect((err as Error).message).toContain('ORG_ADMIN');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// requireAnyRole()
// ═══════════════════════════════════════════════════════════════

describe('requireAnyRole()', () => {
  it('does NOT throw when context satisfies one of multiple required roles', () => {
    expect(() =>
      requireAnyRole(STUDENT_CTX, ['STUDENT', 'INSTRUCTOR'])
    ).not.toThrow();
  });

  it('does NOT throw when context satisfies exactly one role', () => {
    expect(() =>
      requireAnyRole(INSTRUCTOR_CTX, ['ORG_ADMIN', 'INSTRUCTOR'])
    ).not.toThrow();
  });

  it('does NOT throw for SUPER_ADMIN regardless of required roles', () => {
    expect(() =>
      requireAnyRole(SUPER_ADMIN_CTX, ['ORG_ADMIN', 'RESEARCHER'])
    ).not.toThrow();
  });

  it('throws Forbidden when context has none of the required roles', () => {
    expect(() =>
      requireAnyRole(STUDENT_CTX, ['INSTRUCTOR', 'ORG_ADMIN'])
    ).toThrow('Forbidden: One of roles [INSTRUCTOR, ORG_ADMIN] required');
  });

  it('includes all role names in the Forbidden error message', () => {
    expect(() =>
      requireAnyRole(STUDENT_CTX, ['RESEARCHER', 'ORG_ADMIN', 'SUPER_ADMIN'])
    ).toThrow('[RESEARCHER, ORG_ADMIN, SUPER_ADMIN]');
  });

  it('throws Unauthorized when context is null', () => {
    expect(() => requireAnyRole(null, ['STUDENT'])).toThrow(
      'Unauthorized: No authentication context'
    );
  });

  it('throws Forbidden when roles array is empty (non-SUPER_ADMIN user)', () => {
    // hasRole is always false for an empty required-roles list
    expect(() => requireAnyRole(STUDENT_CTX, [])).toThrow('Forbidden');
  });

  it('does NOT throw for SUPER_ADMIN even with an empty required roles list', () => {
    expect(() => requireAnyRole(SUPER_ADMIN_CTX, [])).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// requireTenantAccess()
// ═══════════════════════════════════════════════════════════════

describe('requireTenantAccess()', () => {
  it('does NOT throw when context.tenantId matches the required tenantId', () => {
    expect(() => requireTenantAccess(STUDENT_CTX, TENANT_ID)).not.toThrow();
  });

  it('does NOT throw for SUPER_ADMIN even when tenant IDs differ', () => {
    expect(() =>
      requireTenantAccess(SUPER_ADMIN_CTX, 'completely-different-tenant')
    ).not.toThrow();
  });

  it('throws Forbidden when tenantId does not match', () => {
    expect(() => requireTenantAccess(STUDENT_CTX, 'other-tenant-uuid')).toThrow(
      'Forbidden: Access to this tenant is not allowed'
    );
  });

  it('throws Forbidden when context has no tenantId (undefined) but resource requires one', () => {
    const noTenantCtx: AuthContext = { ...STUDENT_CTX, tenantId: undefined };
    expect(() => requireTenantAccess(noTenantCtx, TENANT_ID)).toThrow(
      'Forbidden: Access to this tenant is not allowed'
    );
  });

  it('throws Unauthorized when context is null', () => {
    expect(() => requireTenantAccess(null, TENANT_ID)).toThrow(
      'Unauthorized: No authentication context'
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// UserRole Zod enum
// ═══════════════════════════════════════════════════════════════

describe('UserRole (Zod enum)', () => {
  it.each([
    'SUPER_ADMIN',
    'ORG_ADMIN',
    'INSTRUCTOR',
    'STUDENT',
    'RESEARCHER',
  ] as const)('accepts valid role "%s"', (role) => {
    expect(UserRole.safeParse(role).success).toBe(true);
  });

  it('rejects unknown string values', () => {
    expect(UserRole.safeParse('MODERATOR').success).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(UserRole.safeParse('').success).toBe(false);
  });

  it('rejects lowercase variant of a valid role', () => {
    expect(UserRole.safeParse('student').success).toBe(false);
  });

  it('rejects numeric values', () => {
    expect(UserRole.safeParse(42).success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// JWTClaimsSchema — direct Zod schema validation
// ═══════════════════════════════════════════════════════════════

describe('JWTClaimsSchema', () => {
  it('parses a fully-specified valid payload', () => {
    expect(JWTClaimsSchema.safeParse(makePayload()).success).toBe(true);
  });

  it('parses when optional fields are absent (given_name / family_name / tenant_id)', () => {
    const {
      given_name: _gn,
      family_name: _fn,
      tenant_id: _tid,
      ...minimal
    } = makePayload();
    expect(JWTClaimsSchema.safeParse(minimal).success).toBe(true);
  });

  it('accepts audience as a plain string', () => {
    expect(
      JWTClaimsSchema.safeParse(makePayload({ aud: 'single-audience' })).success
    ).toBe(true);
  });

  it('accepts audience as an array of strings', () => {
    expect(
      JWTClaimsSchema.safeParse(
        makePayload({ aud: ['edusphere-app', 'account'] })
      ).success
    ).toBe(true);
  });

  it('fails when sub is not a UUID', () => {
    expect(
      JWTClaimsSchema.safeParse(makePayload({ sub: 'not-a-uuid' })).success
    ).toBe(false);
  });

  it('fails when email is not a valid email address', () => {
    expect(
      JWTClaimsSchema.safeParse(makePayload({ email: 'bad@' })).success
    ).toBe(false);
  });

  it('fails when tenant_id is present but not a UUID', () => {
    expect(
      JWTClaimsSchema.safeParse(makePayload({ tenant_id: 'not-a-uuid' }))
        .success
    ).toBe(false);
  });

  it('fails when realm_access is missing', () => {
    const { realm_access: _ra, ...payload } = makePayload();
    expect(JWTClaimsSchema.safeParse(payload).success).toBe(false);
  });

  it('fails when exp is not a number', () => {
    expect(
      JWTClaimsSchema.safeParse({ ...makePayload(), exp: 'not-a-number' })
        .success
    ).toBe(false);
  });

  it('fails when iat is missing', () => {
    const { iat: _iat, ...payload } = makePayload();
    expect(JWTClaimsSchema.safeParse(payload).success).toBe(false);
  });

  it('fails when iss is missing', () => {
    const { iss: _iss, ...payload } = makePayload();
    expect(JWTClaimsSchema.safeParse(payload).success).toBe(false);
  });

  it('fails when preferred_username is missing', () => {
    const { preferred_username: _u, ...payload } = makePayload();
    expect(JWTClaimsSchema.safeParse(payload).success).toBe(false);
  });
});
