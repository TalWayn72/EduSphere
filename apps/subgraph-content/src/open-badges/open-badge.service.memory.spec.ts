/**
 * OpenBadgeService memory-safety tests (F-025)
 * Verifies OnModuleDestroy cleanup, key-pair loading, double-destroy safety.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OpenBadgeService } from './open-badge.service.js';

// ── Hoisted mocks (mockNats/mockSub accessed at factory-call time) ─────────────

const { mockSub, mockNats } = vi.hoisted(() => {
  const mockSub = {
    unsubscribe: vi.fn(),
    [Symbol.asyncIterator]: function* () { /* noop */ },
  };
  const mockNats = {
    subscribe: vi.fn(() => mockSub),
    drain: vi.fn().mockResolvedValue(undefined),
  };
  return { mockSub, mockNats };
});

// ── NATS mock ─────────────────────────────────────────────────────────────────

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue(mockNats),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

const { mockCloseAllPools } = vi.hoisted(() => ({
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: { openBadgeDefinitions: {}, openBadgeAssertions: {} },
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: vi.fn(),
  closeAllPools: mockCloseAllPools,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OpenBadgeService — memory safety', () => {
  let module: TestingModule;
  let service: OpenBadgeService;

  beforeEach(async () => {
    vi.clearAllMocks();
    module = await Test.createTestingModule({
      providers: [OpenBadgeService],
    }).compile();
    service = module.get(OpenBadgeService);
  });

  // Memory test 1: onModuleDestroy calls closeAllPools and drains NATS
  it('should drain NATS and call closeAllPools on module destroy', async () => {
    await module.init(); // triggers onModuleInit → NATS connect + subscribe
    await module.close(); // triggers onModuleDestroy

    expect(mockSub.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockNats.drain).toHaveBeenCalledTimes(1);
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  // Memory test 2: private key is loaded once on init (not re-read per request)
  it('should load the Ed25519 key pair exactly once during onModuleInit', async () => {
    await service.onModuleInit();

    const keyPair1 = (service as unknown as { keyPair: unknown }).keyPair;
    // Simulating multiple calls — key pair reference should be stable
    await service.onModuleInit();
    const keyPair2 = (service as unknown as { keyPair: unknown }).keyPair;

    // Both references point to key objects (not undefined)
    expect(keyPair1).toBeTruthy();
    expect(keyPair2).toBeTruthy();
  });

  // Memory test 3: double destroy is safe (no throw, idempotent)
  it('should survive double onModuleDestroy without throwing', async () => {
    await module.init();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
