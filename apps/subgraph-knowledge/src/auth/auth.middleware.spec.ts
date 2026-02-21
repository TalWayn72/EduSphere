import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted() runs before vi.mock factories and before ESM imports —
// guaranteeing that mockValidate/mockExtractToken are vi.fn() instances
// when the JWTValidator constructor mock is first invoked at module load time.
const { mockValidate, mockExtractToken } = vi.hoisted(() => ({
  mockValidate: vi.fn(),
  mockExtractToken: vi.fn(),
}));

vi.mock('@edusphere/auth', () => ({
  JWTValidator: vi.fn().mockImplementation(function () {
    this.validate = mockValidate;
    this.extractToken = mockExtractToken;
  }),
}));

import { AuthMiddleware } from './auth.middleware';

describe('AuthMiddleware', function() {
  var middleware;

  beforeEach(function() {
    vi.clearAllMocks();
    middleware = new AuthMiddleware();
  });

  it('validateRequest sets authContext when token is valid', async function() {
    var mockAuth = { userId: 'u-1', tenantId: 't-1', roles: ['STUDENT'], email: 'test@example.com' };
    mockExtractToken.mockReturnValue('valid-token');
    mockValidate.mockResolvedValue(mockAuth);
    var context = { req: { headers: { authorization: 'Bearer valid-token' } } };
    await middleware.validateRequest(context);
    expect(context.authContext).toEqual(mockAuth);
  });

  it('validateRequest does nothing when no authorization header', async function() {
    var context = { req: { headers: {} } };
    await middleware.validateRequest(context);
    expect(context.authContext).toBeUndefined();
    expect(mockExtractToken).not.toHaveBeenCalled();
  });

  it('validateRequest does nothing when extractToken returns null', async function() {
    mockExtractToken.mockReturnValue(null);
    var context = { req: { headers: { authorization: 'Invalid header' } } };
    await middleware.validateRequest(context);
    expect(context.authContext).toBeUndefined();
  });

  it('validateRequest throws Error when JWT validation fails', async function() {
    mockExtractToken.mockReturnValue('bad-token');
    mockValidate.mockRejectedValue(new Error('Invalid token'));
    var context = { req: { headers: { authorization: 'Bearer bad-token' } } };
    await expect(middleware.validateRequest(context)).rejects.toThrow('Unauthorized');
  });
});
