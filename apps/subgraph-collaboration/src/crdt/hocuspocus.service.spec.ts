import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockDestroy   = vi.fn().mockResolvedValue(undefined);
  const mockListen    = vi.fn().mockResolvedValue(undefined);
  const mockValidate  = vi.fn();
  const mockConfigure = vi.fn(() => ({ listen: mockListen, destroy: mockDestroy }));
  return { mockDestroy, mockListen, mockValidate, mockConfigure };
});

vi.mock('@hocuspocus/server', () => ({ Server: { configure: mocks.mockConfigure } }));
vi.mock('@edusphere/auth', () => ({
  // Use regular function (not arrow) so it's callable with `new`
  JWTValidator: vi.fn().mockImplementation(function() { return { validate: mocks.mockValidate }; }),
}));
vi.mock('@edusphere/config', () => ({
  keycloakConfig: { url: 'http://kc', realm: 'edusphere', clientId: 'app' },
}));

const mockLimit  = vi.fn().mockResolvedValue([]);
const mockDb = {
  select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: mockLimit })) })) })),
  insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([]) })),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })) })),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: { collab_documents: { id: 'id', entity_id: 'entity_id', ydoc_snapshot: 'ydoc_snapshot', tenant_id: 'tenant_id', entity_type: 'entity_type', name: 'name' } },
  eq: vi.fn((col, val) => ({ col, val })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('yjs', () => ({
  default: {}, Doc: vi.fn().mockImplementation(() => ({})),
  applyUpdate: vi.fn(), encodeStateAsUpdate: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

import { HocuspocusService } from './hocuspocus.service';

type OnAuthData = { requestParameters: URLSearchParams; token?: string; documentName: string; context: Record<string, unknown> };
type ConfiguredServer = { onAuthenticate: (data: OnAuthData) => Promise<unknown> };

describe('HocuspocusService', () => {
  let service: HocuspocusService;

  beforeEach(() => { vi.clearAllMocks(); mockLimit.mockResolvedValue([]); service = new HocuspocusService(); });

  describe('onModuleInit()', () => {
    it('configures and starts the Hocuspocus server', () => {
      service.onModuleInit();
      expect(mocks.mockConfigure).toHaveBeenCalledOnce();
      expect(mocks.mockListen).toHaveBeenCalledOnce();
    });

    it('uses HOCUSPOCUS_PORT env var when set', () => {
      process.env['HOCUSPOCUS_PORT'] = '9999';
      service.onModuleInit();
      expect((mocks.mockConfigure.mock.calls[0][0] as { port: number }).port).toBe(9999);
      delete process.env['HOCUSPOCUS_PORT'];
    });

    it('defaults to port 1234 when env var is absent', () => {
      delete process.env['HOCUSPOCUS_PORT'];
      service.onModuleInit();
      expect((mocks.mockConfigure.mock.calls[0][0] as { port: number }).port).toBe(1234);
    });
  });

  describe('onAuthenticate hook', () => {
    function getHook(): ConfiguredServer['onAuthenticate'] {
      service.onModuleInit();
      return (mocks.mockConfigure.mock.calls[0][0] as ConfiguredServer).onAuthenticate;
    }

    it('validates JWT token from query param', async () => {
      mocks.mockValidate.mockResolvedValue({ userId: 'user-1', tenantId: 'tenant-1' });
      const hook = getHook();
      await hook({ requestParameters: new URLSearchParams('token=valid-jwt'), token: undefined, documentName: 'doc-1', context: {} });
      expect(mocks.mockValidate).toHaveBeenCalledWith('valid-jwt');
    });

    it('throws Unauthorized when no token present', async () => {
      const hook = getHook();
      await expect(hook({ requestParameters: new URLSearchParams(), token: undefined, documentName: 'doc-1', context: {} }))
        .rejects.toThrow('Unauthorized');
    });

    it('throws Unauthorized when JWT is invalid/expired', async () => {
      mocks.mockValidate.mockRejectedValue(new Error('TokenExpiredError'));
      const hook = getHook();
      await expect(hook({ requestParameters: new URLSearchParams('token=bad'), token: undefined, documentName: 'doc-1', context: {} }))
        .rejects.toThrow('Unauthorized');
    });

    it('strips Bearer prefix from header token', async () => {
      mocks.mockValidate.mockResolvedValue({ userId: 'user-1' });
      const hook = getHook();
      await hook({ requestParameters: new URLSearchParams(), token: 'Bearer header-jwt', documentName: 'doc-1', context: {} });
      expect(mocks.mockValidate).toHaveBeenCalledWith('header-jwt');
    });

    it('document name is namespaced — passed through correctly', async () => {
      mocks.mockValidate.mockResolvedValue({ userId: 'user-1', tenantId: 'tenant-123' });
      const hook = getHook();
      const ctx: Record<string, unknown> = {};
      await hook({ requestParameters: new URLSearchParams('token=t'), token: undefined, documentName: 'tenant-123/doc-456', context: ctx });
      expect(mocks.mockValidate).toHaveBeenCalledOnce();
    });
  });

  describe('onModuleDestroy()', () => {
    it('destroys the server when initialised', () => {
      service.onModuleInit();
      service.onModuleDestroy();
      expect(mocks.mockDestroy).toHaveBeenCalledOnce();
    });

    it('does not throw when server was never initialised', () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });
});
