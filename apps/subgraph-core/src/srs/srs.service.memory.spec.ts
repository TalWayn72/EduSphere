/**
 * Memory leak tests for SrsService.
 *
 * Verifies that onModuleDestroy():
 *   1. Clears the setInterval digest handle
 *   2. Drains the NATS connection
 *   3. Calls closeAllPools() to release DB connections
 *
 * Rule: every @Injectable() with createDatabaseConnection() + setInterval
 * MUST implement OnModuleDestroy calling clearInterval + closeAllPools.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock hoisting: factories must not reference outer variables.
// Use vi.fn() inline only.
vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: { spacedRepetitionCards: {} },
  withTenantContext: vi.fn(),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  eq: vi.fn(),
  and: vi.fn(),
  lte: vi.fn(),
  sql: vi.fn(),
}));

import { SrsService } from './srs.service';
import * as nats from 'nats';

describe('SrsService — memory safety', () => {
  let service: SrsService;
  let clearIntervalSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    service = new SrsService();
    await service.onModuleInit();
  });

  it('calls closeAllPools() exactly once during onModuleDestroy', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledTimes(1);
  });

  it('calls clearInterval() to stop the daily digest timer', async () => {
    await service.onModuleDestroy();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('drains the NATS connection on destroy', async () => {
    // Access the mock nats connection's drain spy
    const mockConnect = nats.connect as ReturnType<typeof vi.fn>;
    const mockNatsConn = (await mockConnect.mock.results[0]?.value) as {
      drain: ReturnType<typeof vi.fn>;
    };
    await service.onModuleDestroy();
    expect(mockNatsConn.drain).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — second destroy does not throw', async () => {
    await service.onModuleDestroy();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });

  it('implements OnModuleDestroy interface', () => {
    expect(typeof service.onModuleDestroy).toBe('function');
  });

  it('implements OnModuleInit interface', () => {
    expect(typeof service.onModuleInit).toBe('function');
  });
});
