/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks use any for partial service stubs */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

vi.mock('./webhook-validation', () => ({
  MAX_RETRIES: 3,
  AUTO_DISABLE_THRESHOLD: 10,
  WEBHOOK_TIMEOUT_MS: 10000,
}));

vi.mock('@edusphere/db', () => ({
  withTenantContext: vi.fn(
    async (_d: unknown, _c: unknown, fn: (t: unknown) => unknown) => fn(_d)
  ),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...vals: unknown[]) => ({
      sql: strings,
      vals,
    })),
    { raw: vi.fn((a: unknown) => ({ sqlRaw: a })) }
  ),
}));

import { WebhookDeliveryService } from './webhook-delivery.service';
import type { Webhook } from './webhook-delivery.service';

describe('WebhookDeliveryService', () => {
  let service: WebhookDeliveryService;
  const originalFetch = globalThis.fetch;
  const ctx = { tenantId: 't1', userId: 'u1', userRole: 'ORG_ADMIN' as const };

  const mockWebhook: Webhook = {
    id: 'wh-1',
    url: 'https://example.com/hook',
    events: ['course.completed'],
    isActive: true,
    failureCount: 0,
    lastTriggeredAt: null,
    createdAt: new Date(),
  };

  const mockDb = {
    execute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    service = new WebhookDeliveryService();
    // Default: DB returns a secret
    mockDb.execute.mockResolvedValue({
      rows: [{ secret: 'webhook-secret-key' }],
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  describe('dispatchToWebhook', () => {
    it('sends POST with correct headers on successful delivery', async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue({ ok: true, status: 200 }) as any;
      // Mock recordDelivery
      vi.spyOn(service, 'recordDelivery').mockResolvedValue({
        id: 'del-1',
        eventType: 'course.completed',
        responseStatus: 200,
        attempt: 1,
        status: 'DELIVERED',
        deliveredAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.dispatchToWebhook(
        mockDb as any,
        mockWebhook,
        'course.completed',
        { courseId: 'c1' },
        ctx
      );

      expect(result.status).toBe('DELIVERED');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/hook',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ courseId: 'c1' }),
        })
      );
      const callArgs = (globalThis.fetch as any).mock.calls[0][1];
      expect(callArgs.headers['X-EduSphere-Event']).toBe('course.completed');
      expect(callArgs.headers['X-EduSphere-Signature']).toMatch(/^sha256=/);
    });

    it('records FAILED status when fetch returns non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }) as any;
      vi.spyOn(service, 'recordDelivery').mockResolvedValue({
        id: 'del-2',
        eventType: 'course.completed',
        responseStatus: 500,
        attempt: 1,
        status: 'FAILED',
        deliveredAt: null,
        createdAt: new Date(),
      });

      const result = await service.dispatchToWebhook(
        mockDb as any,
        mockWebhook,
        'course.completed',
        {},
        ctx
      );
      expect(result.status).toBe('FAILED');
    });

    it('schedules retry on network error when attempt < MAX_RETRIES', async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new Error('ECONNREFUSED')) as any;
      vi.spyOn(service, 'recordDelivery').mockResolvedValue({
        id: 'del-3',
        eventType: 'course.completed',
        responseStatus: null,
        attempt: 1,
        status: 'RETRYING',
        deliveredAt: null,
        createdAt: new Date(),
      });

      const result = await service.dispatchToWebhook(
        mockDb as any,
        mockWebhook,
        'course.completed',
        {},
        ctx,
        1
      );
      expect(result.status).toBe('RETRYING');
    });

    it('returns FAILED when max retries exceeded', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('timeout')) as any;
      vi.spyOn(service, 'recordDelivery').mockResolvedValue({
        id: 'del-4',
        eventType: 'course.completed',
        responseStatus: null,
        attempt: 3,
        status: 'FAILED',
        deliveredAt: null,
        createdAt: new Date(),
      });

      const result = await service.dispatchToWebhook(
        mockDb as any,
        mockWebhook,
        'course.completed',
        {},
        ctx,
        3
      );
      expect(result.status).toBe('FAILED');
    });
  });

  describe('recordDelivery', () => {
    it('inserts delivery record and resets failure on DELIVERED', async () => {
      const mockTx = {
        execute: vi
          .fn()
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'del-1',
                event_type: 'course.completed',
                response_status: 200,
                attempt: 1,
                status: 'DELIVERED',
                delivered_at: new Date(),
                created_at: new Date(),
              },
            ],
          })
          .mockResolvedValueOnce(undefined),
      };
      const { withTenantContext } = await import('@edusphere/db');
      (withTenantContext as any).mockImplementation(
        async (_d: unknown, _c: unknown, fn: (t: unknown) => unknown) =>
          fn(mockTx)
      );

      const result = await service.recordDelivery(
        mockDb as any,
        'wh-1',
        ctx,
        'course.completed',
        {},
        200,
        1,
        'DELIVERED'
      );
      expect(result.status).toBe('DELIVERED');
      expect(result.responseStatus).toBe(200);
      // Two execute calls: INSERT + UPDATE (reset failure_count)
      expect(mockTx.execute).toHaveBeenCalledTimes(2);
    });

    it('increments failure count on FAILED delivery', async () => {
      const mockTx = {
        execute: vi
          .fn()
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'del-2',
                event_type: 'badge.issued',
                response_status: null,
                attempt: 3,
                status: 'FAILED',
                delivered_at: null,
                created_at: new Date(),
              },
            ],
          })
          .mockResolvedValueOnce(undefined),
      };
      const { withTenantContext } = await import('@edusphere/db');
      (withTenantContext as any).mockImplementation(
        async (_d: unknown, _c: unknown, fn: (t: unknown) => unknown) =>
          fn(mockTx)
      );

      const result = await service.recordDelivery(
        mockDb as any,
        'wh-1',
        ctx,
        'badge.issued',
        {},
        null,
        3,
        'FAILED'
      );
      expect(result.status).toBe('FAILED');
      expect(mockTx.execute).toHaveBeenCalledTimes(2);
    });

    it('throws BadRequestException when insert returns no rows', async () => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      };
      const { withTenantContext } = await import('@edusphere/db');
      (withTenantContext as any).mockImplementation(
        async (_d: unknown, _c: unknown, fn: (t: unknown) => unknown) =>
          fn(mockTx)
      );

      await expect(
        service.recordDelivery(
          mockDb as any,
          'wh-1',
          ctx,
          'user.joined',
          {},
          null,
          1,
          'RETRYING'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });
});
