/**
 * at-risk.service.memory.spec.ts — Memory safety tests for AtRiskService.
 * Verifies that onModuleDestroy closes NATS connection and DB pools.
 * F-003 Performance Risk Detection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (must run before vi.mock factories) ─────────────────────────

const { mockClose, mockCloseAllPools } = vi.hoisted(() => ({
  mockClose: vi.fn().mockResolvedValue(undefined),
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
}));

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  ScheduleModule: { forRoot: vi.fn() },
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({ close: mockClose, publish: vi.fn() }),
  StringCodec: vi.fn().mockReturnValue({ encode: vi.fn((v: string) => v) }),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn().mockReturnValue({
    transaction: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
  }),
  closeAllPools: mockCloseAllPools,
  withBypassRLS: vi.fn().mockResolvedValue([]),
  withTenantContext: vi.fn().mockResolvedValue([]),
  schema: {
    tenants: {},
    userCourses: {},
    courses: {},
    userProgress: {},
    quizResults: {},
    contentItems: {},
    modules: {},
    atRiskFlags: {},
  },
  eq: vi.fn(),
  and: vi.fn(),
}));

// ── Import after mocks (vi.mock is hoisted, so this is safe) ──────────────────

import { AtRiskService } from './at-risk.service.js';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AtRiskService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call closeAllPools on onModuleDestroy', async () => {
    const service = new AtRiskService();
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  it('should close NATS connection if open on onModuleDestroy', async () => {
    const service = new AtRiskService();
    // Manually inject a NATS connection to simulate it being open
    (service as { nc: { close: () => Promise<void> } | null }).nc = { close: mockClose };
    await service.onModuleDestroy();
    expect(mockClose).toHaveBeenCalled();
  });

  it('should not throw if NATS was never opened on onModuleDestroy', async () => {
    const service = new AtRiskService();
    expect((service as { nc: unknown }).nc).toBeNull();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });
});
