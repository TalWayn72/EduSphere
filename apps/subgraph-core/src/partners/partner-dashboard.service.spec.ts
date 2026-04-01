/**
 * partner-dashboard.service.spec.ts — Unit tests for PartnerDashboardService.
 * Tests getDashboard (happy + not found) and regenerateApiKey (hash + return).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

const mockLimit = vi.fn();
const mockReturning = vi.fn();
const mockSet = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: (...a: unknown[]) => mockLimit(...a),
          orderBy: vi.fn().mockReturnValue({
            limit: (...a: unknown[]) => mockLimit(...a),
          }),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: (...a: unknown[]) => {
        mockSet(...a);
        return {
          where: vi.fn().mockReturnValue({
            returning: (...b: unknown[]) => mockReturning(...b),
          }),
        };
      },
    }),
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    partners: { id: 'id', apiKeyHash: 'apiKeyHash', updatedAt: 'updatedAt' },
    partnerRevenue: { partnerId: 'partnerId', month: 'month' },
  },
  eq: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
}));

import { closeAllPools } from '@edusphere/db';
const mockCloseAllPools = vi.mocked(closeAllPools);

const PARTNER_ID = 'p-001';

describe('PartnerDashboardService', () => {
  let service: PartnerDashboardService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([]);
    mockReturning.mockResolvedValue([]);
    // Re-import to get fresh service with fresh mock DB
    const mod = await import('./partner-dashboard.service.js');
    service = new mod.PartnerDashboardService();
  });

  describe('getDashboard', () => {
    it('throws NotFoundException when partner does not exist', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await expect(service.getDashboard(PARTNER_ID)).rejects.toThrow(
        NotFoundException
      );
    });

    it('returns dashboard with masked API key and revenue', async () => {
      const partner = {
        id: PARTNER_ID,
        status: 'active',
        apiKeyHash: 'abcdef1234567890abcdef',
      };
      const revenueRows = [
        { partnerId: PARTNER_ID, month: '2026-03', partnerPayoutUsd: 500 },
        { partnerId: PARTNER_ID, month: '2026-02', partnerPayoutUsd: 300 },
      ];

      mockLimit.mockResolvedValueOnce([partner]);
      mockLimit.mockResolvedValueOnce(revenueRows);

      const result = await service.getDashboard(PARTNER_ID);

      expect(result.status).toBe('active');
      expect(result.apiKeyMasked).toBe('abcdef12****');
      expect(result.totalRevenue).toBe(800);
      expect(result.revenueByMonth).toHaveLength(2);
      expect(result.revenueByMonth[0]).toEqual({
        month: '2026-03',
        amount: 500,
      });
    });

    it('returns zero totalRevenue when no revenue rows', async () => {
      mockLimit.mockResolvedValueOnce([
        { id: PARTNER_ID, status: 'pending', apiKeyHash: '00000000rest' },
      ]);
      mockLimit.mockResolvedValueOnce([]);

      const result = await service.getDashboard(PARTNER_ID);
      expect(result.totalRevenue).toBe(0);
      expect(result.revenueByMonth).toEqual([]);
    });
  });

  describe('regenerateApiKey', () => {
    it('throws NotFoundException when partner does not exist', async () => {
      mockReturning.mockResolvedValueOnce([]);

      await expect(service.regenerateApiKey(PARTNER_ID)).rejects.toThrow(
        NotFoundException
      );
    });

    it('returns a 64-char hex raw key', async () => {
      mockReturning.mockResolvedValueOnce([{ id: PARTNER_ID }]);

      const result = await service.regenerateApiKey(PARTNER_ID);
      expect(result.newApiKey).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns different keys on successive calls', async () => {
      mockReturning.mockResolvedValueOnce([{ id: PARTNER_ID }]);
      const a = await service.regenerateApiKey(PARTNER_ID);

      mockReturning.mockResolvedValueOnce([{ id: PARTNER_ID }]);
      const b = await service.regenerateApiKey(PARTNER_ID);

      expect(a.newApiKey).not.toBe(b.newApiKey);
    });

    it('persists SHA-256 hash of the raw key (not the raw key)', async () => {
      mockReturning.mockResolvedValue([{ id: PARTNER_ID }]);

      const result = await service.regenerateApiKey(PARTNER_ID);

      expect(mockSet).toHaveBeenCalledOnce();
      const setArg = mockSet.mock.calls[0][0] as Record<string, unknown>;
      const storedHash = setArg['apiKeyHash'] as string;
      expect(storedHash).toHaveLength(64);
      expect(storedHash).not.toBe(result.newApiKey);
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalledOnce();
    });
  });
});
