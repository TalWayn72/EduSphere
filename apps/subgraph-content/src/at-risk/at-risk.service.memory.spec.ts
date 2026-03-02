/**
 * at-risk.service.memory.spec.ts — Memory safety tests for AtRiskService.
 * Verifies that onModuleDestroy closes NATS connection and DB pools,
 * and that getAtRiskLearners / dismissFlag use withTenantContext.
 * F-003 Performance Risk Detection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (must run before vi.mock factories) ─────────────────────────

const { mockClose, mockCloseAllPools, mockWithTenantContext } = vi.hoisted(
  () => ({
    mockClose: vi.fn().mockResolvedValue(undefined),
    mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
    mockWithTenantContext: vi.fn().mockResolvedValue([]),
  })
);

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
  withTenantContext: mockWithTenantContext,
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

vi.mock('./risk-scorer.js', () => ({
  computeRiskScore: vi
    .fn()
    .mockReturnValue({ score: 0.5, factors: {}, isAtRisk: false }),
}));

// ── Import after mocks (vi.mock is hoisted, so this is safe) ──────────────────

import { AtRiskService } from './at-risk.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CTX = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'SUPER_ADMIN' as const,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AtRiskService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTenantContext.mockResolvedValue([]);
  });

  // Test 1
  it('constructs without errors', () => {
    const service = new AtRiskService();
    expect(service).toBeInstanceOf(AtRiskService);
  });

  // Test 2
  it('should call closeAllPools on onModuleDestroy', async () => {
    const service = new AtRiskService();
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // Test 3
  it('should close NATS connection if open on onModuleDestroy', async () => {
    const service = new AtRiskService();
    // Manually inject a NATS connection to simulate it being open
    (service as { nc: { close: () => Promise<void> } | null }).nc = {
      close: mockClose,
    };
    await service.onModuleDestroy();
    expect(mockClose).toHaveBeenCalled();
  });

  // Test 4
  it('should not throw if NATS was never opened on onModuleDestroy', async () => {
    const service = new AtRiskService();
    expect((service as { nc: unknown }).nc).toBeNull();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // Test 5
  it('onModuleDestroy is idempotent — calling twice does not throw', async () => {
    const service = new AtRiskService();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(2);
  });

  // Test 6
  it('onModuleDestroy skips NATS close when nc is null', async () => {
    const service = new AtRiskService();
    (service as { nc: null }).nc = null;
    await service.onModuleDestroy();
    expect(mockClose).not.toHaveBeenCalled();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // Test 7
  it('getAtRiskLearners calls withTenantContext with the correct context', async () => {
    const service = new AtRiskService();
    mockWithTenantContext.mockResolvedValueOnce([]);
    await service.getAtRiskLearners('course-1', CTX);
    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: CTX.tenantId }),
      expect.any(Function)
    );
  });

  // Test 8
  it('getAtRiskLearners returns empty array when no active flags', async () => {
    const service = new AtRiskService();
    mockWithTenantContext.mockResolvedValueOnce([]);
    const result = await service.getAtRiskLearners('course-1', CTX);
    expect(result).toEqual([]);
  });

  // Test 9
  it('getAtRiskLearners maps rows to AtRiskLearner shape', async () => {
    const flagRow = {
      id: 'flag-1',
      learnerId: 'learner-1',
      courseId: 'course-1',
      tenantId: 'tenant-1',
      riskScore: 0.8,
      riskFactors: { inactiveForDays: true, lowProgress: false },
      flaggedAt: new Date('2025-01-15'),
      status: 'active',
      resolvedAt: null,
    };
    const service = new AtRiskService();
    mockWithTenantContext.mockResolvedValueOnce([flagRow]);
    const result = await service.getAtRiskLearners('course-1', CTX);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('flag-1');
    expect(result[0]!.learnerId).toBe('learner-1');
    expect(result[0]!.riskScore).toBe(0.8);
    expect(result[0]!.riskFactors).toHaveLength(1); // only truthy factors
    expect(result[0]!.riskFactors[0]!.key).toBe('inactiveForDays');
  });

  // Test 10
  it('dismissFlag calls withTenantContext and returns true', async () => {
    const service = new AtRiskService();
    mockWithTenantContext.mockResolvedValueOnce([]);
    const result = await service.dismissFlag('flag-42', CTX);
    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: CTX.tenantId }),
      expect.any(Function)
    );
    expect(result).toBe(true);
  });
});
