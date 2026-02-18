import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── vi.hoisted ensures variables are available when vi.mock factory runs ──────

const { mockExtractToken, mockValidate } = vi.hoisted(() => {
  return {
    mockExtractToken: vi.fn(),
    mockValidate: vi.fn(),
  };
});

vi.mock('@edusphere/auth', () => ({
  JWTValidator: vi.fn().mockImplementation(() => ({
    extractToken: mockExtractToken,
    validate: mockValidate,
  })),
}));

import { AuthMiddleware } from './auth.middleware';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_AUTH_CONTEXT = {
  userId: 'user-1',
  email: 'student@example.com',
  username: 'student',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
  isSuperAdmin: false,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = new AuthMiddleware();
  });

  // ─── No authorization header ──────────────────────────────────────────────

  describe('validateRequest() — no authorization header', () => {
    it('returns without setting authContext when no authorization header', async () => {
      const ctx: any = { req: { headers: {} } };
      await middleware.validateRequest(ctx);
      expect(ctx.authContext).toBeUndefined();
    });

    it('returns without setting authContext when headers are empty', async () => {
      const ctx: any = { req: { headers: {} } };
      await middleware.validateRequest(ctx);
      expect(ctx.authContext).toBeUndefined();
    });

    it('does not call extractToken when no authorization header', async () => {
      const ctx: any = { req: { headers: {} } };
      await middleware.validateRequest(ctx);
      expect(mockExtractToken).not.toHaveBeenCalled();
    });

    it('does not call validate when no authorization header', async () => {
      const ctx: any = { req: { headers: {} } };
      await middleware.validateRequest(ctx);
      expect(mockValidate).not.toHaveBeenCalled();
    });
  });

  // ─── Invalid token format ─────────────────────────────────────────────────

  describe('validateRequest() — invalid token format', () => {
    it('returns without authContext when extractToken returns null', async () => {
      mockExtractToken.mockReturnValue(null);
      const ctx: any = { req: { headers: { authorization: 'Invalid format' } } };
      await middleware.validateRequest(ctx);
      expect(ctx.authContext).toBeUndefined();
    });

    it('does not call validate when extractToken returns null', async () => {
      mockExtractToken.mockReturnValue(null);
      const ctx: any = { req: { headers: { authorization: 'BadHeader' } } };
      await middleware.validateRequest(ctx);
      expect(mockValidate).not.toHaveBeenCalled();
    });

    it('does not call validate when extractToken returns undefined', async () => {
      mockExtractToken.mockReturnValue(undefined);
      const ctx: any = { req: { headers: { authorization: 'Bearer ' } } };
      await middleware.validateRequest(ctx);
      expect(mockValidate).not.toHaveBeenCalled();
    });

    it('does not set authContext when token extraction fails', async () => {
      mockExtractToken.mockReturnValue(null);
      const ctx: any = { req: { headers: { authorization: 'NotBearer xxx' } } };
      await middleware.validateRequest(ctx);
      expect(ctx.authContext).toBeUndefined();
    });
  });

  // ─── Valid JWT ────────────────────────────────────────────────────────────

  describe('validateRequest() — valid JWT', () => {
    it('sets authContext on the context object when JWT is valid', async () => {
      mockExtractToken.mockReturnValue('valid-jwt-token');
      mockValidate.mockResolvedValue(MOCK_AUTH_CONTEXT);

      const ctx: any = { req: { headers: { authorization: 'Bearer valid-jwt-token' } } };
      await middleware.validateRequest(ctx);

      expect(ctx.authContext).toEqual(MOCK_AUTH_CONTEXT);
    });

    it('calls extractToken with the full authorization header string', async () => {
      mockExtractToken.mockReturnValue('my-token');
      mockValidate.mockResolvedValue(MOCK_AUTH_CONTEXT);

      const ctx: any = { req: { headers: { authorization: 'Bearer my-token' } } };
      await middleware.validateRequest(ctx);

      expect(mockExtractToken).toHaveBeenCalledWith('Bearer my-token');
    });

    it('calls validate with the token returned by extractToken', async () => {
      mockExtractToken.mockReturnValue('extracted-token');
      mockValidate.mockResolvedValue(MOCK_AUTH_CONTEXT);

      const ctx: any = { req: { headers: { authorization: 'Bearer extracted-token' } } };
      await middleware.validateRequest(ctx);

      expect(mockValidate).toHaveBeenCalledWith('extracted-token');
    });

    it('sets correct userId from validated authContext', async () => {
      mockExtractToken.mockReturnValue('token');
      mockValidate.mockResolvedValue({ ...MOCK_AUTH_CONTEXT, userId: 'user-42' });

      const ctx: any = { req: { headers: { authorization: 'Bearer token' } } };
      await middleware.validateRequest(ctx);

      expect(ctx.authContext?.userId).toBe('user-42');
    });

    it('sets correct tenantId from validated authContext', async () => {
      mockExtractToken.mockReturnValue('token');
      mockValidate.mockResolvedValue({ ...MOCK_AUTH_CONTEXT, tenantId: 'tenant-99' });

      const ctx: any = { req: { headers: { authorization: 'Bearer token' } } };
      await middleware.validateRequest(ctx);

      expect(ctx.authContext?.tenantId).toBe('tenant-99');
    });

    it('sets correct email from validated authContext', async () => {
      mockExtractToken.mockReturnValue('token');
      mockValidate.mockResolvedValue({ ...MOCK_AUTH_CONTEXT, email: 'admin@org.com' });

      const ctx: any = { req: { headers: { authorization: 'Bearer token' } } };
      await middleware.validateRequest(ctx);

      expect(ctx.authContext?.email).toBe('admin@org.com');
    });

    it('sets correct roles from validated authContext', async () => {
      mockExtractToken.mockReturnValue('token');
      mockValidate.mockResolvedValue({ ...MOCK_AUTH_CONTEXT, roles: ['ORG_ADMIN'] });

      const ctx: any = { req: { headers: { authorization: 'Bearer token' } } };
      await middleware.validateRequest(ctx);

      expect(ctx.authContext?.roles).toEqual(['ORG_ADMIN']);
    });
  });

  // ─── JWT validation failure ───────────────────────────────────────────────

  describe('validateRequest() — JWT validation failure', () => {
    it('throws "Unauthorized" when validate rejects with expired token error', async () => {
      mockExtractToken.mockReturnValue('expired-token');
      mockValidate.mockRejectedValue(new Error('Token expired'));

      const ctx: any = { req: { headers: { authorization: 'Bearer expired-token' } } };

      await expect(middleware.validateRequest(ctx)).rejects.toThrow('Unauthorized');
    });

    it('throws "Unauthorized" when validate rejects with signature error', async () => {
      mockExtractToken.mockReturnValue('bad-sig-token');
      mockValidate.mockRejectedValue(new Error('Invalid signature'));

      const ctx: any = { req: { headers: { authorization: 'Bearer bad-sig-token' } } };

      await expect(middleware.validateRequest(ctx)).rejects.toThrow('Unauthorized');
    });

    it('does not set authContext when JWT validation throws', async () => {
      mockExtractToken.mockReturnValue('bad-token');
      mockValidate.mockRejectedValue(new Error('Invalid signature'));

      const ctx: any = { req: { headers: { authorization: 'Bearer bad-token' } } };

      try {
        await middleware.validateRequest(ctx);
      } catch (_) { /* expected */ }

      expect(ctx.authContext).toBeUndefined();
    });
  });
});
