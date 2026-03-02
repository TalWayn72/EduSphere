import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
}));

import { LtiResolver } from './lti.resolver.js';

// ---------------------------------------------------------------------------
// Mock service
// ---------------------------------------------------------------------------

const mockLtiService = {
  getPlatforms: vi.fn(),
  registerPlatform: vi.fn(),
  togglePlatform: vi.fn(),
};

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-lti';
const USER_ID = 'user-lti';

const AUTH_CTX = { tenantId: TENANT_ID, userId: USER_ID, roles: ['ORG_ADMIN'] };
/** Pass `null` to simulate missing authContext */
const makeCtx = (auth: typeof AUTH_CTX | null = AUTH_CTX) => ({
  authContext: auth ?? undefined,
});

const PLATFORM_DTO = {
  id: 'plat-1',
  name: 'Canvas LMS',
  issuer: 'https://canvas.instructure.com',
  clientId: 'client-abc',
  isActive: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LtiResolver', () => {
  let resolver: LtiResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new LtiResolver(mockLtiService as never);
  });

  // ── requireAuth ────────────────────────────────────────────────────────────

  it('ltiPlatforms — throws UnauthorizedException when authContext absent', async () => {
    await expect(resolver.ltiPlatforms(makeCtx(null))).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('ltiPlatforms — throws UnauthorizedException when userId missing', async () => {
    const ctx = { authContext: { tenantId: TENANT_ID, userId: '', roles: [] } };
    await expect(resolver.ltiPlatforms(ctx as never)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('ltiPlatforms — throws UnauthorizedException when tenantId missing', async () => {
    const ctx = { authContext: { tenantId: '', userId: USER_ID, roles: [] } };
    await expect(resolver.ltiPlatforms(ctx as never)).rejects.toThrow(
      UnauthorizedException
    );
  });

  // ── ltiPlatforms ───────────────────────────────────────────────────────────

  it('ltiPlatforms — calls service with tenantId and returns result', async () => {
    mockLtiService.getPlatforms.mockResolvedValue([PLATFORM_DTO]);

    const result = await resolver.ltiPlatforms(makeCtx());

    expect(mockLtiService.getPlatforms).toHaveBeenCalledWith(TENANT_ID);
    expect(result).toEqual([PLATFORM_DTO]);
  });

  // ── registerLtiPlatform ────────────────────────────────────────────────────

  it('registerLtiPlatform — passes tenantId and input to service', async () => {
    mockLtiService.registerPlatform.mockResolvedValue(PLATFORM_DTO);

    const input = {
      name: 'Canvas LMS',
      issuer: 'https://canvas.instructure.com',
      clientId: 'client-abc',
      authorizationUrl:
        'https://canvas.instructure.com/api/lti/authorize_redirect',
      jwksUrl: 'https://canvas.instructure.com/api/lti/security/jwks',
      tokenUrl: 'https://canvas.instructure.com/login/oauth2/token',
    };

    const result = await resolver.registerLtiPlatform(input, makeCtx());

    expect(mockLtiService.registerPlatform).toHaveBeenCalledWith(
      TENANT_ID,
      input
    );
    expect(result).toBe(PLATFORM_DTO);
  });

  // ── toggleLtiPlatform ──────────────────────────────────────────────────────

  it('toggleLtiPlatform — passes id, tenantId, and isActive to service', async () => {
    const toggled = { ...PLATFORM_DTO, isActive: false };
    mockLtiService.togglePlatform.mockResolvedValue(toggled);

    const result = await resolver.toggleLtiPlatform('plat-1', false, makeCtx());

    expect(mockLtiService.togglePlatform).toHaveBeenCalledWith(
      'plat-1',
      TENANT_ID,
      false
    );
    expect(result).toBe(toggled);
  });

  it('toggleLtiPlatform — throws UnauthorizedException when unauthenticated', async () => {
    await expect(
      resolver.toggleLtiPlatform('plat-1', true, makeCtx(null))
    ).rejects.toThrow(UnauthorizedException);
  });
});
