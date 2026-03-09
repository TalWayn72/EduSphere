import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock @edusphere/db ─────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(),
  schema: {
    xapiStatements: {
      tenantId: 'tenant_id',
      verb: 'verb',
      actor: 'actor',
      context: 'context',
    },
  },
  count: vi.fn(() => ({ sql: 'COUNT(*)' })),
  eq: vi.fn((a: unknown, b: unknown) => ({ a, b })),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) =>
      strings.reduce(
        (acc: string, str: string, i: number) =>
          acc + str + String(values[i] ?? ''),
        ''
      ),
    {
      join: vi.fn(
        (parts: unknown[], _sep: unknown) =>
          Array.isArray(parts) ? parts.join(',') : ''
      ),
    }
  ),
}));

import * as db from '@edusphere/db';
import { AiUsageService } from './ai-usage.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGroupBy = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

function _buildChain(finalValue: unknown) {
  const chain = {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    groupBy: mockGroupBy,
    orderBy: mockOrderBy,
    limit: mockLimit,
  };
  mockSelect.mockReturnValue(chain);
  mockFrom.mockReturnValue(chain);
  mockWhere.mockReturnValue(chain);
  mockGroupBy.mockReturnValue(chain);
  mockOrderBy.mockReturnValue(chain);
  mockLimit.mockResolvedValue(finalValue);
  return chain;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AiUsageService', () => {
  let service: AiUsageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AiUsageService();
  });

  describe('getAiUsageStats', () => {
    it('returns valid shape with all required fields', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(
        (_db: unknown, _ctx: unknown, op: (tx: unknown) => Promise<unknown>) => {
          let callCount = 0;
          const tx = {
            select: () => ({
              from: () => ({
                where: () => {
                  callCount++;
                  if (callCount === 1) return Promise.resolve([{ total: 10 }]);
                  if (callCount === 2) return Promise.resolve([{ unique: 4 }]);
                  return { groupBy: () => ({ orderBy: () => ({ limit: () => Promise.resolve([]) }) }) };
                },
              }),
            }),
          };
          return op(tx);
        }
      );

      const result = await service.getAiUsageStats(TENANT_ID);

      expect(typeof result.totalRequests).toBe('number');
      expect(typeof result.uniqueLearnersUsed).toBe('number');
      expect(typeof result.estimatedTokensUsed).toBe('number');
      expect(typeof result.topCourseRequests).toBe('number');
      // topCourseId can be null
      expect(result.topCourseId === null || typeof result.topCourseId === 'string').toBe(true);
    });

    it('returns zero stats when no AI tutor statements found', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(
        (_db: unknown, _ctx: unknown, op: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            select: () => ({
              from: () => ({
                where: () => Promise.resolve([{ total: 0 }]),
              }),
            }),
          };
          return op(tx);
        }
      );

      const result = await service.getAiUsageStats(TENANT_ID);

      expect(result.totalRequests).toBe(0);
      expect(result.uniqueLearnersUsed).toBe(0);
      expect(result.estimatedTokensUsed).toBe(0);
      expect(result.topCourseId).toBeNull();
      expect(result.topCourseRequests).toBe(0);
    });

    it('estimatedTokensUsed is totalRequests * 500', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(
        (_db: unknown, _ctx: unknown, op: (tx: unknown) => Promise<unknown>) => {
          let callCount = 0;
          const tx = {
            select: () => ({
              from: () => ({
                where: () => {
                  callCount++;
                  if (callCount === 1) return Promise.resolve([{ total: 8 }]);
                  if (callCount === 2) return Promise.resolve([{ unique: 3 }]);
                  return { groupBy: () => ({ orderBy: () => ({ limit: () => Promise.resolve([]) }) }) };
                },
              }),
            }),
          };
          return op(tx);
        }
      );

      const result = await service.getAiUsageStats(TENANT_ID);

      expect(result.totalRequests).toBe(8);
      expect(result.estimatedTokensUsed).toBe(4000); // 8 * 500
    });

    it('uses withTenantContext with ORG_ADMIN role', async () => {
      vi.mocked(db.withTenantContext).mockResolvedValue({
        totalRequests: 0,
        uniqueLearnersUsed: 0,
        estimatedTokensUsed: 0,
        topCourseId: null,
        topCourseRequests: 0,
      });

      await service.getAiUsageStats(TENANT_ID);

      expect(vi.mocked(db.withTenantContext)).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: TENANT_ID,
          userRole: 'ORG_ADMIN',
        }),
        expect.any(Function)
      );
    });
  });

  describe('getAiUsageStatsByTenantCtx', () => {
    it('delegates to getAiUsageStats with tenantId from ctx', async () => {
      vi.mocked(db.withTenantContext).mockResolvedValue({
        totalRequests: 0,
        uniqueLearnersUsed: 0,
        estimatedTokensUsed: 0,
        topCourseId: null,
        topCourseRequests: 0,
      });

      const ctx = { tenantId: TENANT_ID, userId: 'u1', userRole: 'ORG_ADMIN' as const };
      const result = await service.getAiUsageStatsByTenantCtx(ctx);

      expect(typeof result.totalRequests).toBe('number');
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools on module destroy', async () => {
      await service.onModuleDestroy();
      expect(vi.mocked(db.closeAllPools)).toHaveBeenCalledTimes(1);
    });
  });
});
