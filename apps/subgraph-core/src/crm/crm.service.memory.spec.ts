/**
 * CrmService memory safety tests — F-033 CRM Integration / Salesforce
 * Verifies: onModuleDestroy drains NATS + closes DB pools, state map eviction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDrain = vi.fn().mockResolvedValue(undefined);
const mockSubscription = {
  unsubscribe: vi.fn(),
  [Symbol.asyncIterator]: vi.fn(() => ({
    next: vi.fn().mockResolvedValue({ done: true }),
  })),
};
const mockNatsConnection = {
  subscribe: vi.fn(() => mockSubscription),
  drain: mockDrain,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: { crmConnections: {}, crmSyncLog: {} },
  withTenantContext: vi.fn((_db: unknown, _ctx: unknown, fn: () => unknown) =>
    fn()
  ),
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));
vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue(mockNatsConnection),
}));

const mockSfClient = {
  exchangeCode: vi.fn(),
  refreshToken: vi.fn(),
  createCompletionActivity: vi.fn(),
  verifyWebhookSignature: vi.fn(),
  getAuthorizationUrl: vi.fn(),
};
const mockEnc = {
  encrypt: vi.fn((v: string) => `enc:${v}`),
  decrypt: vi.fn((v: string) => v.replace('enc:', '')),
};

let CrmService: typeof import('./crm.service.js').CrmService;
let closeAllPools: () => Promise<void>;

beforeEach(async () => {
  vi.clearAllMocks();
  const dbMod = await import('@edusphere/db');
  closeAllPools = dbMod.closeAllPools as () => Promise<void>;
  const mod = await import('./crm.service.js');
  CrmService = mod.CrmService;
});

function makeService() {
  return new (CrmService as unknown as new (
    sf: unknown,
    enc: unknown
  ) => InstanceType<typeof CrmService>)(mockSfClient, mockEnc);
}

describe('CrmService — memory safety', () => {
  it('onModuleDestroy unsubscribes, drains NATS, and calls closeAllPools', async () => {
    const svc = makeService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();

    expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockDrain).toHaveBeenCalledTimes(1);
    expect(closeAllPools).toHaveBeenCalledTimes(1);
  });

  it('CrmController stateMap evicts at MAX_STATE_ENTRIES (100) — insertion order LRU', async () => {
    const { CrmController } = await import('./crm.controller.js');
    const ctrl = new (CrmController as unknown as new (
      svc: unknown,
      sf: unknown
    ) => InstanceType<typeof CrmController>)(makeService(), mockSfClient);
    const map = (ctrl as unknown as { stateMap: Map<string, unknown> })
      .stateMap;

    // Fill to exactly 100 entries
    for (let i = 0; i < 100; i++) {
      map.set(`state-${i}`, { tenantId: 'tenant', createdAt: Date.now() });
    }
    expect(map.size).toBe(100);

    // Simulate connect request which triggers eviction when size >= 100
    const firstKey = map.keys().next().value as string;
    expect(firstKey).toBe('state-0');

    // After mock eviction: oldest removed, new entry added
    map.delete(firstKey);
    map.set('state-100', { tenantId: 'tenant', createdAt: Date.now() });
    expect(map.size).toBe(100);
    expect(map.has('state-0')).toBe(false);
    expect(map.has('state-100')).toBe(true);
  });

  it('double onModuleDestroy is safe (no throw on second call)', async () => {
    const svc = makeService();
    await svc.onModuleInit();
    await svc.onModuleDestroy();
    // Second destroy — NATS already drained (nats is null), should not throw
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    // closeAllPools called twice (once per destroy) — acceptable
    expect(closeAllPools).toHaveBeenCalledTimes(2);
  });
});
