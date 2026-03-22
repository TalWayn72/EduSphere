/**
 * Unit tests for AnalyticsExportController — API key validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import { AnalyticsExportController } from './analytics-export.controller';

// Mock @edusphere/db
const mockExecute = vi.fn();
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    execute: mockExecute,
  })),
  closeAllPools: vi.fn(),
  withTenantContext: vi.fn(
    (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn({ execute: vi.fn().mockResolvedValue({ rows: [] }) })
  ),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  }),
}));

describe('AnalyticsExportController', () => {
  let controller: AnalyticsExportController;

  beforeEach(() => {
    controller = new AnalyticsExportController();
    mockExecute.mockReset();
  });

  describe('API key validation', () => {
    it('should reject missing Authorization header', async () => {
      const mockRes = { setHeader: vi.fn(), json: vi.fn(), send: vi.fn() };
      await expect(
        controller.exportAnalytics(
          undefined,
          'json',
          undefined,
          undefined,
          mockRes as never
        )
      ).rejects.toThrow('Authorization header required');
    });

    it('should reject malformed Authorization header', async () => {
      const mockRes = { setHeader: vi.fn(), json: vi.fn(), send: vi.fn() };
      await expect(
        controller.exportAnalytics(
          'InvalidFormat',
          'json',
          undefined,
          undefined,
          mockRes as never
        )
      ).rejects.toThrow('Authorization header must be: Bearer <api_key>');
    });

    it('should reject invalid API key (no match in DB)', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const mockRes = { setHeader: vi.fn(), json: vi.fn(), send: vi.fn() };
      await expect(
        controller.exportAnalytics(
          'Bearer esk_live_invalidkey12345678901234',
          'json',
          undefined,
          undefined,
          mockRes as never
        )
      ).rejects.toThrow('Invalid API key');
    });

    it('should reject revoked API key', async () => {
      const testKey = 'esk_live_test1234567890123456789012';
      const keyHash = createHash('sha256').update(testKey).digest('hex');
      mockExecute.mockResolvedValueOnce({
        rows: [{
          id: 'key-1',
          tenant_id: 'tenant-1',
          scopes: ['analytics:read'],
          rate_limit_per_minute: 60,
          is_active: false,
          expires_at: null,
        }],
      });
      const mockRes = { setHeader: vi.fn(), json: vi.fn(), send: vi.fn() };
      await expect(
        controller.exportAnalytics(
          `Bearer ${testKey}`,
          'json',
          undefined,
          undefined,
          mockRes as never
        )
      ).rejects.toThrow('API key has been revoked');
    });

    it('should reject expired API key', async () => {
      const testKey = 'esk_live_test1234567890123456789012';
      mockExecute.mockResolvedValueOnce({
        rows: [{
          id: 'key-1',
          tenant_id: 'tenant-1',
          scopes: ['analytics:read'],
          rate_limit_per_minute: 60,
          is_active: true,
          expires_at: new Date('2020-01-01'),
        }],
      });
      const mockRes = { setHeader: vi.fn(), json: vi.fn(), send: vi.fn() };
      await expect(
        controller.exportAnalytics(
          `Bearer ${testKey}`,
          'json',
          undefined,
          undefined,
          mockRes as never
        )
      ).rejects.toThrow('API key has expired');
    });

    it('should reject API key without analytics:read scope', async () => {
      const testKey = 'esk_live_test1234567890123456789012';
      mockExecute.mockResolvedValueOnce({
        rows: [{
          id: 'key-1',
          tenant_id: 'tenant-1',
          scopes: ['courses:read'],
          rate_limit_per_minute: 60,
          is_active: true,
          expires_at: null,
        }],
      });
      const mockRes = { setHeader: vi.fn(), json: vi.fn(), send: vi.fn() };
      await expect(
        controller.exportAnalytics(
          `Bearer ${testKey}`,
          'json',
          undefined,
          undefined,
          mockRes as never
        )
      ).rejects.toThrow('API key missing analytics:read scope');
    });

    it('should reject invalid format parameter', async () => {
      const testKey = 'esk_live_test1234567890123456789012';
      mockExecute.mockResolvedValueOnce({
        rows: [{
          id: 'key-1',
          tenant_id: 'tenant-1',
          scopes: ['analytics:read'],
          rate_limit_per_minute: 60,
          is_active: true,
          expires_at: null,
        }],
      });
      const mockRes = { setHeader: vi.fn(), json: vi.fn(), send: vi.fn() };
      await expect(
        controller.exportAnalytics(
          `Bearer ${testKey}`,
          'xml',
          undefined,
          undefined,
          mockRes as never
        )
      ).rejects.toThrow('format must be csv or json');
    });

    it('should accept valid API key and return JSON', async () => {
      const testKey = 'esk_live_test1234567890123456789012';
      // First call: validateApiKey
      mockExecute.mockResolvedValueOnce({
        rows: [{
          id: 'key-1',
          tenant_id: 'tenant-1',
          scopes: ['analytics:read'],
          rate_limit_per_minute: 60,
          is_active: true,
          expires_at: null,
        }],
      });
      // Second call: updateLastUsed
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const mockRes = {
        setHeader: vi.fn(),
        json: vi.fn(),
        send: vi.fn(),
      };

      await controller.exportAnalytics(
        `Bearer ${testKey}`,
        'json',
        undefined,
        undefined,
        mockRes as never
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limit per API key', async () => {
      const testKey = 'esk_live_ratelimitkey12345678901234';
      const keyRecord = {
        id: 'key-ratelimit',
        tenant_id: 'tenant-1',
        scopes: ['analytics:read'],
        rate_limit_per_minute: 2,
        is_active: true,
        expires_at: null,
      };

      // First 2 requests should succeed
      for (let i = 0; i < 2; i++) {
        mockExecute.mockResolvedValueOnce({ rows: [keyRecord] });
        mockExecute.mockResolvedValueOnce({ rows: [] }); // updateLastUsed
      }

      const mockRes = {
        setHeader: vi.fn(),
        json: vi.fn(),
        send: vi.fn(),
      };

      await controller.exportAnalytics(
        `Bearer ${testKey}`, 'json', undefined, undefined, mockRes as never
      );
      await controller.exportAnalytics(
        `Bearer ${testKey}`, 'json', undefined, undefined, mockRes as never
      );

      // Third request should be rate limited
      mockExecute.mockResolvedValueOnce({ rows: [keyRecord] });
      await expect(
        controller.exportAnalytics(
          `Bearer ${testKey}`, 'json', undefined, undefined, mockRes as never
        )
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('onModuleDestroy', () => {
    it('should call closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await controller.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
