/**
 * xapi-statement.service.memory.spec.ts — Memory safety tests for F-028
 *
 * Tests:
 *  1. onModuleDestroy calls closeAllPools and unsubscribes NATS
 *  2. NATS wildcard subscription cleaned up on destroy
 *  3. external fetch timeout uses Promise.race (race wins on slow response)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCloseAllPools, mockUnsubscribe, mockDrain, mockNatsConnect } = vi.hoisted(() => {
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
  const mockUnsubscribe = vi.fn();
  const mockDrain = vi.fn().mockResolvedValue(undefined);
  const asyncIter = { next: vi.fn().mockResolvedValue({ done: true }) };
  const mockSub = {
    unsubscribe: mockUnsubscribe,
    [Symbol.asyncIterator]: vi.fn().mockReturnValue(asyncIter),
  };
  const mockNatsConnect = vi.fn().mockResolvedValue({
    subscribe: vi.fn().mockReturnValue(mockSub),
    drain: mockDrain,
  });
  return { mockCloseAllPools, mockUnsubscribe, mockDrain, mockNatsConnect };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => ({}),
  closeAllPools: mockCloseAllPools,
  schema: { xapiStatements: {} },
  eq: vi.fn(),
  and: vi.fn((...args: unknown[]) => args),
  gte: vi.fn(),
  lte: vi.fn(),
  withTenantContext: vi.fn().mockImplementation(async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) => fn({})),
}));

vi.mock('nats', () => ({
  connect: mockNatsConnect,
  StringCodec: vi.fn().mockReturnValue({ decode: vi.fn().mockReturnValue('{}'), encode: vi.fn() }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn().mockReturnValue({ servers: 'nats://localhost:4222' }),
}));

import { XapiStatementService } from './xapi-statement.service.js';
import type { XapiStatement } from './xapi.types.js';
import { XAPI_VERBS } from './xapi.types.js';

function makeService() {
  return new XapiStatementService();
}

const sampleStatement: XapiStatement = {
  id: 'stmt-mem-1',
  actor: { objectType: 'Agent', name: 'u-1', mbox: 'mailto:u-1@edusphere.local' },
  verb: { id: XAPI_VERBS.COMPLETED, display: { en: 'completed' } },
  object: { objectType: 'Activity', id: 'https://edusphere.io/activities/c-1', definition: { name: { en: 'Course' } } },
};

describe('XapiStatementService - memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDrain.mockResolvedValue(undefined);
    const asyncIter = { next: vi.fn().mockResolvedValue({ done: true }) };
    const mockSub = { unsubscribe: mockUnsubscribe, [Symbol.asyncIterator]: vi.fn().mockReturnValue(asyncIter) };
    mockNatsConnect.mockResolvedValue({ subscribe: vi.fn().mockReturnValue(mockSub), drain: mockDrain });
  });

  it('test 1: onModuleDestroy calls closeAllPools and unsubscribes NATS', async () => {
    const svc = makeService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockDrain).toHaveBeenCalledTimes(1);
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  it('test 2: NATS wildcard subscription cleaned up on destroy (idempotent destroy)', async () => {
    const svc = makeService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();
    // Second destroy — nc already null, should not throw
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    // closeAllPools called once per destroy
    expect(mockCloseAllPools).toHaveBeenCalledTimes(2);
    // unsubscribe called only once (sub nulled after first destroy)
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('test 3: external fetch timeout uses Promise.race — race wins on slow response', async () => {
    vi.useFakeTimers();
    const neverResolve = new Promise<Response>(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(neverResolve));

    const svc = makeService();
    const forwardPromise = svc.forwardToExternalLrs('https://slow.example.com', 'tok', sampleStatement);

    // Advance past 5-second timeout
    vi.advanceTimersByTime(5100);

    await expect(forwardPromise).rejects.toThrow('LRS forward timeout');

    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
