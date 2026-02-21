import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const logFn = vi.fn();
  const warnFn = vi.fn();
  const debugFn = vi.fn();
  const errorFn = vi.fn();
  const loggerInstance = { log: logFn, warn: warnFn, debug: debugFn, error: errorFn };
  return {
    mockExtractToken: vi.fn(),
    mockValidate: vi.fn(),
    loggerInstance,
    MockLogger: vi.fn().mockImplementation(function() { return loggerInstance; }),
  };
});

vi.mock('@edusphere/auth', () => ({
  JWTValidator: vi.fn().mockImplementation(function() {
    return { extractToken: mocks.mockExtractToken, validate: mocks.mockValidate };
  }),
}));

vi.mock('@nestjs/common', () => ({
  Logger: mocks.MockLogger,
}));

import { AuthMiddleware } from './auth.middleware';

const MOCK_AUTH_CONTEXT = {
  userId: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
  isSuperAdmin: false,
};

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;

  beforeEach(() => {
    mocks.mockExtractToken.mockReset();
    mocks.mockValidate.mockReset();
    mocks.loggerInstance.log.mockReset();
    mocks.loggerInstance.warn.mockReset();
    mocks.loggerInstance.debug.mockReset();
    mocks.loggerInstance.error.mockReset();
    middleware = new AuthMiddleware();
  });

  describe('validateRequest() - no authorization header', () => {
    it('returns early when req is undefined', async () => {
      const ctx = { req: undefined };
      await expect(middleware.validateRequest(ctx as any)).resolves.toBeUndefined();
      expect(mocks.mockExtractToken).not.toHaveBeenCalled();
    });

    it('returns early when headers is missing', async () => {
      const ctx = { req: {} };
      await expect(middleware.validateRequest(ctx as any)).resolves.toBeUndefined();
      expect(mocks.mockExtractToken).not.toHaveBeenCalled();
    });

    it('returns early when authorization header is absent', async () => {
      const ctx = { req: { headers: {} } };
      await expect(middleware.validateRequest(ctx as any)).resolves.toBeUndefined();
      expect(mocks.mockExtractToken).not.toHaveBeenCalled();
    });
  });

  describe('validateRequest() - invalid token format', () => {
    it('returns early when extractToken returns null', async () => {
      mocks.mockExtractToken.mockReturnValue(null);
      const ctx = { req: { headers: { authorization: 'Invalid' } } };
      await expect(middleware.validateRequest(ctx as any)).resolves.toBeUndefined();
      expect(mocks.mockValidate).not.toHaveBeenCalled();
    });
  });

  describe('validateRequest() - valid token', () => {
    it('sets authContext after successful validation', async () => {
      mocks.mockExtractToken.mockReturnValue('valid.jwt.token');
      mocks.mockValidate.mockResolvedValue(MOCK_AUTH_CONTEXT);
      const ctx: any = { req: { headers: { authorization: 'Bearer valid.jwt.token' } } };
      await middleware.validateRequest(ctx);
      expect(ctx.authContext).toEqual(MOCK_AUTH_CONTEXT);
      expect(mocks.mockValidate).toHaveBeenCalledWith('valid.jwt.token');
    });

    it('calls extractToken with the full authorization header value', async () => {
      mocks.mockExtractToken.mockReturnValue('tok');
      mocks.mockValidate.mockResolvedValue(MOCK_AUTH_CONTEXT);
      const ctx: any = { req: { headers: { authorization: 'Bearer tok' } } };
      await middleware.validateRequest(ctx);
      expect(mocks.mockExtractToken).toHaveBeenCalledWith('Bearer tok');
    });
  });

  describe('validateRequest() - JWT validation error', () => {
    it('throws Unauthorized when validate rejects', async () => {
      mocks.mockExtractToken.mockReturnValue('bad');
      mocks.mockValidate.mockRejectedValue(new Error('Expired'));
      const ctx: any = { req: { headers: { authorization: 'Bearer bad' } } };
      await expect(middleware.validateRequest(ctx)).rejects.toThrow('Unauthorized');
    });
  });
});
