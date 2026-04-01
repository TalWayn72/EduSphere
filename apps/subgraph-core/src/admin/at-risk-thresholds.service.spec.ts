/**
 * at-risk-thresholds.service.spec.ts — Unit tests for AtRiskThresholdsService.
 * Tests getThresholds (happy + fallback) and saveThresholds (merge + persist).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AtRiskThresholdsService } from './at-risk-thresholds.service.js';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(),
  schema: { tenants: { id: 'id', settings: 'settings' } },
  eq: vi.fn((...args: unknown[]) => args),
}));

import { withTenantContext, closeAllPools } from '@edusphere/db';

const mockWithTenantContext = vi.mocked(withTenantContext);
const mockCloseAllPools = vi.mocked(closeAllPools);

const TENANT_ID = 't-001';
const CTX = { tenantId: TENANT_ID, userId: 'u-001', userRole: 'ORG_ADMIN' };

const DEFAULT_THRESHOLDS = {
  inactivityDays: 14,
  minCompletionPct: 30,
  minQuizScorePct: 50,
};

describe('AtRiskThresholdsService', () => {
  let service: AtRiskThresholdsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AtRiskThresholdsService();
  });

  describe('getThresholds', () => {
    it('returns stored thresholds from tenant settings', async () => {
      const custom = {
        inactivityDays: 7,
        minCompletionPct: 20,
        minQuizScorePct: 60,
      };
      mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi
            .fn()
            .mockResolvedValue([{ settings: { atRiskThresholds: custom } }]),
        };
        return fn(mockTx as never);
      });

      const result = await service.getThresholds(TENANT_ID, CTX);
      expect(result).toEqual(custom);
    });

    it('returns defaults when tenant has no atRiskThresholds in settings', async () => {
      mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([{ settings: {} }]),
        };
        return fn(mockTx as never);
      });

      const result = await service.getThresholds(TENANT_ID, CTX);
      expect(result).toEqual(DEFAULT_THRESHOLDS);
    });

    it('returns defaults when tenant is not found', async () => {
      mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };
        return fn(mockTx as never);
      });

      const result = await service.getThresholds(TENANT_ID, CTX);
      expect(result).toEqual(DEFAULT_THRESHOLDS);
    });

    it('returns defaults and logs error on DB failure', async () => {
      mockWithTenantContext.mockRejectedValue(new Error('DB down'));

      const result = await service.getThresholds(TENANT_ID, CTX);
      expect(result).toEqual(DEFAULT_THRESHOLDS);
    });
  });

  describe('saveThresholds', () => {
    it('merges thresholds into existing settings and returns input', async () => {
      const newThresholds = {
        inactivityDays: 3,
        minCompletionPct: 50,
        minQuizScorePct: 80,
      };
      let capturedSet: Record<string, unknown> | null = null;

      mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([{ settings: { someOther: true } }]),
          update: vi.fn().mockReturnThis(),
          set: vi.fn((val: Record<string, unknown>) => {
            capturedSet = val;
            return { where: vi.fn().mockResolvedValue(undefined) };
          }),
        };
        return fn(mockTx as never);
      });

      const result = await service.saveThresholds(
        TENANT_ID,
        newThresholds,
        CTX
      );
      expect(result).toEqual(newThresholds);
      expect(capturedSet).toBeDefined();
      expect((capturedSet as Record<string, unknown>)['settings']).toEqual({
        someOther: true,
        atRiskThresholds: newThresholds,
      });
    });

    it('handles null existing settings gracefully', async () => {
      const newThresholds = {
        inactivityDays: 5,
        minCompletionPct: 40,
        minQuizScorePct: 70,
      };

      mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([{ settings: null }]),
          update: vi.fn().mockReturnThis(),
          set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
        };
        return fn(mockTx as never);
      });

      const result = await service.saveThresholds(
        TENANT_ID,
        newThresholds,
        CTX
      );
      expect(result).toEqual(newThresholds);
    });

    it('propagates DB errors to caller', async () => {
      mockWithTenantContext.mockRejectedValue(new Error('Write failed'));

      const thresholds = {
        inactivityDays: 1,
        minCompletionPct: 10,
        minQuizScorePct: 10,
      };
      await expect(
        service.saveThresholds(TENANT_ID, thresholds, CTX)
      ).rejects.toThrow('Write failed');
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalledOnce();
    });
  });
});
