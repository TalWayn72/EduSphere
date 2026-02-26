import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const mockDestroy = vi.fn().mockResolvedValue(undefined);
  const mockListen = vi.fn().mockResolvedValue(undefined);
  const mockConfigure = vi.fn(() => ({
    listen: mockListen,
    destroy: mockDestroy,
  }));
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
  return { mockDestroy, mockListen, mockConfigure, mockCloseAllPools };
});

vi.mock('@hocuspocus/server', () => ({
  Server: { configure: mocks.mockConfigure },
}));

vi.mock('@edusphere/auth', () => ({
  // Regular function (not arrow) so it's callable with `new`
  JWTValidator: vi.fn().mockImplementation(function () {
    return { validate: vi.fn() };
  }),
}));

vi.mock('@edusphere/config', () => ({
  keycloakConfig: { url: 'http://kc', realm: 'edusphere', clientId: 'app' },
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
      })),
    })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([]) })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
    })),
  })),
  schema: { collab_documents: {} },
  eq: vi.fn(),
  closeAllPools: mocks.mockCloseAllPools,
}));

vi.mock('yjs', () => ({
  applyUpdate: vi.fn(),
  encodeStateAsUpdate: vi.fn(() => new Uint8Array()),
}));

import { HocuspocusService } from './hocuspocus.service';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HocuspocusService memory', () => {
  let service: HocuspocusService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HocuspocusService();
  });

  it('calls server.destroy() on module destroy to close all WebSocket connections', () => {
    service.onModuleInit();
    service.onModuleDestroy();
    expect(mocks.mockDestroy).toHaveBeenCalledOnce();
  });

  it('does not throw on onModuleDestroy when server was never started', () => {
    // Destroy without calling onModuleInit — server field is undefined
    expect(() => service.onModuleDestroy()).not.toThrow();
    expect(mocks.mockDestroy).not.toHaveBeenCalled();
  });

  it('server.destroy() is called even after multiple init/destroy cycles', () => {
    service.onModuleInit();
    service.onModuleDestroy();
    service.onModuleInit();
    service.onModuleDestroy();
    expect(mocks.mockDestroy).toHaveBeenCalledTimes(2);
  });

  it('server.destroy() resolves without leaking — promise is awaited', async () => {
    mocks.mockDestroy.mockResolvedValue(undefined);
    service.onModuleInit();
    service.onModuleDestroy();
    // Allow microtask queue to flush so the promise is settled
    await Promise.resolve();
    expect(mocks.mockDestroy).toHaveBeenCalledOnce();
  });

  it('does not throw when server.destroy() rejects (graceful error handling)', async () => {
    mocks.mockDestroy.mockRejectedValue(new Error('destroy failed'));
    service.onModuleInit();
    // onModuleDestroy catches the rejection internally — must not propagate
    expect(() => service.onModuleDestroy()).not.toThrow();
    // Flush the rejected promise so Vitest does not flag unhandled rejections
    await Promise.resolve();
  });
});
