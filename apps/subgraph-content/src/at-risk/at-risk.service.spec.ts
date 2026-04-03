import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (must run before vi.mock factories) ─────────────────────────

const {
  mockCloseAllPools,
  mockWithTenantContext,
  mockWithBypassRLS,
  mockNatsClose,
} = vi.hoisted(() => ({
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
  mockWithTenantContext: vi.fn().mockResolvedValue([]),
  mockWithBypassRLS: vi.fn().mockResolvedValue([]),
  mockNatsClose: vi.fn().mockResolvedValue(undefined),
}));

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  schema: {
    tenants: { id: {} },
    userCourses: { userId: {}, courseId: {}, enrolledAt: {}, status: {} },
    courses: { estimated_hours: {}, id: {}, tenant_id: {} },
    atRiskFlags: {
      id: {},
      courseId: {},
      learnerId: {},
      tenantId: {},
      resolvedAt: {},
      riskScore: {},
      riskFactors: {},
      flaggedAt: {},
      status: {},
    },
    userProgress: {
      lastAccessedAt: {},
      isCompleted: {},
      userId: {},
      contentItemId: {},
      timeSpent: {},
    },
    quizResults: { passed: {}, userId: {}, contentItemId: {} },
    contentItems: { id: {}, moduleId: {} },
    modules: { id: {}, course_id: {} },
  },
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: mockWithTenantContext,
  withBypassRLS: mockWithBypassRLS,
  sql: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    close: mockNatsClose,
    publish: vi.fn(),
    drain: vi.fn(),
  }),
  StringCodec: vi.fn(() => ({
    encode: vi.fn((s: string) => s),
    decode: vi.fn(),
  })),
}));

vi.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  ScheduleModule: { forRoot: vi.fn() },
}));

vi.mock('./risk-scorer.js', () => ({
  computeRiskScore: vi
    .fn()
    .mockReturnValue({ score: 0.5, factors: {}, isAtRisk: false }),
}));

import { AtRiskService } from './at-risk.service.js';
import { AtRiskDetectionService } from './at-risk-detection.service.js';
import { AtRiskFlagService } from './at-risk-flag.service.js';

function buildService() {
  const flagService = new AtRiskFlagService();
  const detectionService = new AtRiskDetectionService(flagService);
  return new AtRiskService(detectionService, flagService);
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CTX = { tenantId: 't1', userId: 'u1', userRole: 'INSTRUCTOR' as const };

const FLAG_ROW = {
  id: 'flag-1',
  learnerId: 'learner-1',
  courseId: 'course-1',
  tenantId: 't1',
  riskScore: 0.9,
  riskFactors: { inactiveForDays: true, lowProgress: false },
  flaggedAt: new Date('2026-01-05T00:00:00.000Z'),
  status: 'active',
  resolvedAt: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AtRiskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTenantContext.mockResolvedValue([]);
  });

  // Test 1: onModuleDestroy calls closeAllPools
  it('onModuleDestroy calls closeAllPools', async () => {
    const service = buildService();
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // Test 2: onModuleDestroy delegates to flags sub-service
  it('onModuleDestroy does not throw', async () => {
    const service = buildService();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });

  // Test 3: onModuleDestroy calls closeAllPools via flags
  it('onModuleDestroy calls closeAllPools', async () => {
    const service = buildService();
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // Test 4: getAtRiskLearners returns data from withTenantContext
  it('getAtRiskLearners returns data from withTenantContext', async () => {
    const service = buildService();
    mockWithTenantContext.mockResolvedValueOnce([FLAG_ROW]);

    const result = await service.getAtRiskLearners('course-1', CTX);

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('flag-1');
    expect(result[0]!.learnerId).toBe('learner-1');
    expect(result[0]!.riskScore).toBe(0.9);
  });

  // Test 5: getAtRiskLearners with empty course returns empty array
  it('getAtRiskLearners with empty course returns empty array', async () => {
    const service = buildService();
    mockWithTenantContext.mockResolvedValueOnce([]);

    const result = await service.getAtRiskLearners('empty-course', CTX);

    expect(result).toEqual([]);
    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 't1' }),
      expect.any(Function)
    );
  });

  // Test 6: dismissFlag calls withTenantContext
  it('dismissFlag calls withTenantContext with correct context', async () => {
    const service = buildService();
    mockWithTenantContext.mockResolvedValueOnce([]);

    const result = await service.dismissFlag('flag-1', CTX);

    expect(result).toBe(true);
    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 't1', userId: 'u1' }),
      expect.any(Function)
    );
  });

  // Test 7: service constructs successfully
  it('service constructs without errors', () => {
    const service = buildService();
    expect(service).toBeDefined();
  });

  // Test 8: service instantiates without error
  it('service instantiates without error', () => {
    expect(() => buildService()).not.toThrow();
  });
});
