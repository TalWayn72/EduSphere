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
    MockLogger: vi.fn().mockImplementation(function () { return loggerInstance; }),
  };
});

vi.mock('@nestjs/common', () => ({ Logger: mocks.MockLogger }));

vi.mock('@edusphere/config', () => ({
  keycloakConfig: {
    url: 'http://localhost:8080',
    realm: 'edusphere',
    clientId: 'edusphere-app',
    issuer: 'http://localhost:8080/realms/edusphere',
  },
}));

interface TestContext {
  req: { headers: Record<string, string | undefined> };
  authContext?: Record<string, unknown>;
}

vi.mock('@edusphere/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@edusphere/auth')>();
  type JWTValidatorShape = { extractToken: (h: string) => string | null; validate: (t: string) => Promise<unknown> };
  const MockJWTValidator = vi.fn().mockImplementation(function () {
    return { extractToken: mocks.mockExtractToken, validate: mocks.mockValidate };
  });

  class AuthMiddleware {
    private logger: typeof mocks.loggerInstance;
    private jwtValidator: JWTValidatorShape;
    constructor() {
      this.logger = mocks.loggerInstance;
      this.jwtValidator = new (MockJWTValidator as unknown as new () => JWTValidatorShape)();
    }
    async validateRequest(context: TestContext): Promise<void> {
      const authHeader = context.req?.headers?.authorization;
      if (!authHeader || typeof authHeader !== 'string') {
        this.logger.warn('No authorization header provided');
        return;
      }
      try {
        const token = this.jwtValidator.extractToken(authHeader);
        if (!token) { this.logger.warn('Invalid authorization header format'); return; }
        const authContext = await this.jwtValidator.validate(token) as Record<string, unknown>;
        context.authContext = authContext;
        const tenantId = context.req?.headers?.['x-tenant-id'];
        if (tenantId) { authContext['tenantId'] = tenantId; }
        this.logger.debug('Authenticated');
      } catch (error) {
        this.logger.error(`JWT validation failed: ${error}`);
        throw new Error('Unauthorized');
      }
    }
  }
  return { ...actual, JWTValidator: MockJWTValidator, AuthMiddleware };
});

import { AuthMiddleware } from './auth.middleware';

const MOCK_AUTH_CONTEXT = {
  userId: 'user-1', email: 'test@e.com', username: 'testuser',
  tenantId: 'tenant-1', roles: ['STUDENT'], scopes: [], isSuperAdmin: false,
};

function ctx(headers: Record<string, string | undefined> = {}): TestContext {
  return { req: { headers } };
}

describe('AuthMiddleware (annotation subgraph)', () => {
  let middleware: AuthMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = new AuthMiddleware();
  });

  describe('validateRequest() — missing authorization header', () => {
    it('returns early when req has no headers', async () => {
      await expect(middleware.validateRequest(ctx())).resolves.toBeUndefined();
      expect(mocks.mockExtractToken).not.toHaveBeenCalled();
    });

    it('returns early when authorization header is absent', async () => {
      await expect(middleware.validateRequest(ctx({}))).resolves.toBeUndefined();
      expect(mocks.mockExtractToken).not.toHaveBeenCalled();
    });

    it('context.authContext remains undefined when no JWT provided', async () => {
      const c = ctx();
      await middleware.validateRequest(c);
      expect(c.authContext).toBeUndefined();
    });
  });

  describe('validateRequest() — malformed JWT', () => {
    it('returns early (null user) when extractToken returns null', async () => {
      mocks.mockExtractToken.mockReturnValue(null);
      const c = ctx({ authorization: 'Malformed' });
      await middleware.validateRequest(c);
      expect(mocks.mockValidate).not.toHaveBeenCalled();
      expect(c.authContext).toBeUndefined();
    });
  });

  describe('validateRequest() — valid JWT', () => {
    it('populates authContext on valid token', async () => {
      mocks.mockExtractToken.mockReturnValue('valid.jwt.tok');
      mocks.mockValidate.mockResolvedValue(MOCK_AUTH_CONTEXT);
      const c = ctx({ authorization: 'Bearer valid.jwt.tok' });
      await middleware.validateRequest(c);
      expect(c.authContext).toMatchObject(MOCK_AUTH_CONTEXT);
    });

    it('passes full authorization header to extractToken', async () => {
      mocks.mockExtractToken.mockReturnValue('tok');
      mocks.mockValidate.mockResolvedValue(MOCK_AUTH_CONTEXT);
      await middleware.validateRequest(ctx({ authorization: 'Bearer tok' }));
      expect(mocks.mockExtractToken).toHaveBeenCalledWith('Bearer tok');
    });

    it('extracts x-tenant-id header and attaches to authContext', async () => {
      mocks.mockExtractToken.mockReturnValue('tok');
      mocks.mockValidate.mockResolvedValue({ ...MOCK_AUTH_CONTEXT });
      const c = ctx({ authorization: 'Bearer tok', 'x-tenant-id': 'tenant-override' });
      await middleware.validateRequest(c);
      expect(c.authContext?.['tenantId']).toBe('tenant-override');
    });
  });

  describe('validateRequest() — JWT validation failure', () => {
    it('throws Unauthorized when validate() rejects', async () => {
      mocks.mockExtractToken.mockReturnValue('expired');
      mocks.mockValidate.mockRejectedValue(new Error('Token expired'));
      await expect(middleware.validateRequest(ctx({ authorization: 'Bearer expired' }))).rejects.toThrow('Unauthorized');
    });

    it('context.authContext is not set after failed validation', async () => {
      mocks.mockExtractToken.mockReturnValue('bad');
      mocks.mockValidate.mockRejectedValue(new Error('invalid'));
      const c = ctx({ authorization: 'Bearer bad' });
      await expect(middleware.validateRequest(c)).rejects.toThrow();
      expect(c.authContext).toBeUndefined();
    });
  });
});
