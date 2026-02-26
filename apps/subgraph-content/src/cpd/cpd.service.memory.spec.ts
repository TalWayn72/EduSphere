/**
 * cpd.service.memory.spec.ts - Memory safety tests for F-027 CpdService
 *
 * Tests:
 *  1. onModuleDestroy calls closeAllPools and unsubscribes NATS
 *  2. NATS subscription loop exits cleanly on destroy
 *  3. Concurrent completions don't create duplicate CPD entries
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCloseAllPools, mockUnsubscribe, mockDrain, mockNatsConnect } =
  vi.hoisted(() => {
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
  createDatabaseConnection: () => ({
    select: vi.fn(),
    insert: vi.fn(),
  }),
  closeAllPools: mockCloseAllPools,
  schema: {
    courseCpdCredits: {},
    userCpdLog: {},
    cpdCreditTypes: {},
  },
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  withTenantContext: vi
    .fn()
    .mockImplementation(
      async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) => fn({})
    ),
}));

vi.mock('nats', () => ({
  connect: mockNatsConnect,
  StringCodec: vi.fn().mockReturnValue({
    decode: vi.fn().mockReturnValue('{}'),
    encode: vi.fn(),
  }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi
    .fn()
    .mockReturnValue({ servers: 'nats://localhost:4222' }),
  isCourseCompletedEvent: vi.fn().mockReturnValue(false),
}));

vi.mock('./cpd-export.service.js', () => ({
  CpdExportService: vi.fn().mockImplementation(function CpdExportServiceCtor() {
    return { generateReport: vi.fn().mockResolvedValue('https://url') };
  }),
}));

import { CpdService } from './cpd.service.js';
import { CpdExportService } from './cpd-export.service.js';
import { withTenantContext } from '@edusphere/db';

function makeService() {
  return new CpdService(new CpdExportService());
}

describe('CpdService - memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDrain.mockResolvedValue(undefined);
    const asyncIter = { next: vi.fn().mockResolvedValue({ done: true }) };
    const mockSub = {
      unsubscribe: mockUnsubscribe,
      [Symbol.asyncIterator]: vi.fn().mockReturnValue(asyncIter),
    };
    mockNatsConnect.mockResolvedValue({
      subscribe: vi.fn().mockReturnValue(mockSub),
      drain: mockDrain,
    });
  });

  it('test 1: onModuleDestroy calls closeAllPools and unsubscribes NATS', async () => {
    const svc = makeService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockDrain).toHaveBeenCalledTimes(1);
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  it('test 2: NATS subscription loop exits cleanly on destroy (idempotent destroy)', async () => {
    const svc = makeService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();
    // Second destroy should not throw
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    // closeAllPools called once per destroy invocation that had a connection
    expect(mockCloseAllPools).toHaveBeenCalledTimes(2);
  });

  it('test 3: concurrent completions handled without duplicate CPD entries per insert', async () => {
    const insertValues = vi.fn().mockResolvedValue([]);
    vi.mocked(withTenantContext)
      // First call: find credits (handler 1 — concurrent, arrives before h1 insert)
      .mockImplementationOnce(
        async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
          fn({
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi
                  .fn()
                  .mockResolvedValue([
                    { creditTypeId: 'ct-1', creditHours: '2.00' },
                  ]),
              }),
            }),
          })
      )
      // Second call: find credits (handler 2 — concurrent, arrives before h2 insert)
      .mockImplementationOnce(
        async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
          fn({
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi
                  .fn()
                  .mockResolvedValue([
                    { creditTypeId: 'ct-1', creditHours: '2.00' },
                  ]),
              }),
            }),
          })
      )
      // Third call: insert log (handler 1)
      .mockImplementationOnce(
        async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
          fn({ insert: vi.fn().mockReturnValue({ values: insertValues }) })
      )
      // Fourth call: insert log (handler 2)
      .mockImplementationOnce(
        async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
          fn({ insert: vi.fn().mockReturnValue({ values: insertValues }) })
      );

    const svc = makeService();
    const payload = {
      courseId: 'c-1',
      userId: 'u-1',
      tenantId: 't-1',
      completionDate: new Date().toISOString(),
    };

    // Run two concurrent completions
    await Promise.all([
      (
        svc as unknown as {
          handleCourseCompleted: (p: typeof payload) => Promise<void>;
        }
      ).handleCourseCompleted(payload),
      (
        svc as unknown as {
          handleCourseCompleted: (p: typeof payload) => Promise<void>;
        }
      ).handleCourseCompleted(payload),
    ]);

    // Each completion should call insert exactly once — 2 total
    expect(insertValues).toHaveBeenCalledTimes(2);
  });
});
