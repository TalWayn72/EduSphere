import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AtRiskService } from './at-risk.service.js';

// ── Mock @edusphere/db ─────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockInnerJoin = vi.fn();
const mockWhere = vi.fn();
const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
const mockWithTenantContext = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  withTenantContext: mockWithTenantContext,
  schema: {
    atRiskFlags: {
      learnerId: 'learner_id',
      courseId: 'course_id',
      tenantId: 'tenant_id',
      flaggedAt: 'flagged_at',
      riskScore: 'risk_score',
      status: 'status',
    },
    users: {
      id: 'id',
      display_name: 'display_name',
    },
    courses: {
      id: 'id',
      title: 'title',
    },
  },
  sql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
      ''
    ),
  and: (...args: unknown[]) => args,
  eq: (a: unknown, b: unknown) => ({ a, b }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0000-000000000099';

function makeFlag(overrides: {
  learnerId?: string;
  courseId?: string;
  displayName?: string;
  courseTitle?: string;
  flaggedAt?: Date;
  riskScore?: number;
}) {
  return {
    learnerId: overrides.learnerId ?? '00000000-0000-0000-0000-000000000010',
    courseId: overrides.courseId ?? '00000000-0000-0000-0000-000000000020',
    displayName: overrides.displayName ?? 'Alice Smith',
    courseTitle: overrides.courseTitle ?? 'Intro to AI',
    flaggedAt: overrides.flaggedAt ?? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    riskScore: overrides.riskScore ?? 0.8,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AtRiskService', () => {
  let service: AtRiskService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AtRiskService();

    // Default: delegate operation to the callback
    mockWithTenantContext.mockImplementation(
      (_db: unknown, _ctx: unknown, operation: (db: unknown) => Promise<unknown>) => {
        const chainMock = {
          select: mockSelect.mockReturnThis(),
          from: mockFrom.mockReturnThis(),
          innerJoin: mockInnerJoin.mockReturnThis(),
          where: mockWhere,
        };
        return operation(chainMock);
      }
    );
  });

  describe('getAtRiskLearners', () => {
    it('returns mapped learner DTOs from query results', async () => {
      const flag = makeFlag({});
      mockWhere.mockResolvedValue([flag]);

      const result = await service.getAtRiskLearners(TENANT_ID, USER_ID, 30);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        userId: flag.learnerId,
        displayName: 'Alice Smith',
        courseId: flag.courseId,
        courseTitle: 'Intro to AI',
        progressPct: 80,
      });
      expect(result[0].daysSinceActive).toBeGreaterThanOrEqual(13);
    });

    it('returns empty array when no active flags exist', async () => {
      mockWhere.mockResolvedValue([]);

      const result = await service.getAtRiskLearners(TENANT_ID, USER_ID, 30);

      expect(result).toEqual([]);
    });

    it('maps multiple learners correctly', async () => {
      const flags = [
        makeFlag({ displayName: 'Alice', riskScore: 0.9 }),
        makeFlag({
          learnerId: '00000000-0000-0000-0000-000000000011',
          displayName: 'Bob',
          riskScore: 0.5,
        }),
      ];
      mockWhere.mockResolvedValue(flags);

      const result = await service.getAtRiskLearners(TENANT_ID, USER_ID, 30);

      expect(result).toHaveLength(2);
      expect(result[0].displayName).toBe('Alice');
      expect(result[1].displayName).toBe('Bob');
    });

    it('falls back to truncated userId when displayName is empty', async () => {
      const flag = makeFlag({ displayName: '' });
      mockWhere.mockResolvedValue([flag]);

      const result = await service.getAtRiskLearners(TENANT_ID, USER_ID, 30);

      expect(result[0].displayName).toContain('Learner ');
    });

    it('uses withTenantContext with ORG_ADMIN role', async () => {
      mockWhere.mockResolvedValue([]);

      await service.getAtRiskLearners(TENANT_ID, USER_ID, 30);

      expect(mockWithTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: TENANT_ID,
          userId: USER_ID,
          userRole: 'ORG_ADMIN',
        }),
        expect.any(Function)
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools on module destroy', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
    });
  });
});
