/**
 * plagiarism.service.memory.spec.ts - Memory safety tests for PlagiarismService (F-005)
 *
 * Verifies:
 *  1. NATS subscription unsubscribed on onModuleDestroy
 *  2. NATS connection drained on onModuleDestroy
 *  3. closeAllPools called on onModuleDestroy
 *  4. onModuleDestroy is idempotent
 *  5. Handles NATS errors gracefully
 *  6. Does not throw if NATS connect fails on init
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
    execute: vi.fn().mockResolvedValue([]),
    select: vi.fn(),
    update: vi.fn(),
  }),
  closeAllPools: mockCloseAllPools,
  schema: { textSubmissions: {}, submissionEmbeddings: {}, tenants: {} },
  eq: vi.fn(),
  and: vi.fn(),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  withTenantContext: vi.fn(),
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
}));

import { PlagiarismService } from './plagiarism.service.js';
import { EmbeddingClient } from './embedding.client.js';

function makeService() {
  const client = new EmbeddingClient();
  vi.spyOn(client, 'embed').mockResolvedValue(new Array(768).fill(0));
  return new PlagiarismService(client);
}

describe('PlagiarismService - memory safety', () => {
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

  it('unsubscribes NATS subscription on destroy', async () => {
    const svc = makeService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('drains NATS connection on destroy', async () => {
    const svc = makeService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();
    expect(mockDrain).toHaveBeenCalledTimes(1);
  });

  it('calls closeAllPools on destroy', async () => {
    const svc = makeService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy is idempotent (second call does not throw)', async () => {
    const svc = makeService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('handles NATS drain error gracefully', async () => {
    mockDrain.mockRejectedValueOnce(new Error('drain failed'));
    const svc = makeService();
    await svc.onModuleInit();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('does not throw if NATS connect fails on init', async () => {
    mockNatsConnect.mockRejectedValueOnce(new Error('NATS unavailable'));
    const svc = makeService();
    await expect(svc.onModuleInit()).resolves.toBeUndefined();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
  });
});
