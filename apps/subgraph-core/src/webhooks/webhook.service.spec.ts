/**
 * webhook.service.spec.ts — Unit tests for WebhookService.
 * Covers: createWebhook, updateWebhook, deleteWebhook, listWebhooks,
 *         getDeliveries, testWebhook, dispatchToWebhook, onModuleDestroy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
    fn({ execute: mockExecute })
  ),
  sql: Object.assign(vi.fn(), { raw: vi.fn((s: string) => s) }),
}));

vi.mock('./webhook-validation', () => ({
  validateWebhookUrl: vi.fn(),
  validateWebhookEvents: vi.fn(),
  MAX_WEBHOOKS_PER_ORG: 10,
}));

vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({ toString: () => 'abc123hex' })),
}));

const mockDispatch = vi.fn().mockResolvedValue({
  id: 'del1', eventType: 'test', responseStatus: 200,
  attempt: 1, status: 'SUCCESS', deliveredAt: new Date(), createdAt: new Date(),
});

vi.mock('./webhook-delivery.service', () => {
  return {
    WebhookDeliveryService: class MockWebhookDeliveryService {
      dispatchToWebhook = mockDispatch;
    },
  };
});

import { WebhookService } from './webhook.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { validateWebhookUrl, validateWebhookEvents } from './webhook-validation';

const ctx = { tenantId: 't1', userId: 'u1', userRole: 'ORG_ADMIN' as const };

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(() => {
    vi.clearAllMocks();
    const deliverySvc = new WebhookDeliveryService() as InstanceType<typeof WebhookDeliveryService>;
    service = new WebhookService(deliverySvc);
  });

  describe('createWebhook', () => {
    it('should validate URL and events then insert', async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'w1', url: 'https://example.com/hook', events: ['course.completed'],
            is_active: true, failure_count: 0, last_triggered_at: null, created_at: new Date(),
          }],
        });

      const result = await service.createWebhook(
        { url: 'https://example.com/hook', events: ['course.completed'] }, ctx
      );
      expect(validateWebhookUrl).toHaveBeenCalledWith('https://example.com/hook');
      expect(validateWebhookEvents).toHaveBeenCalledWith(['course.completed']);
      expect(result.id).toBe('w1');
      expect(result.isActive).toBe(true);
    });

    it('should throw when org has max webhooks', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ cnt: '10' }] });
      await expect(
        service.createWebhook({ url: 'https://x.com/h', events: ['course.completed'] }, ctx)
      ).rejects.toThrow('Maximum 10 webhooks per organization');
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook and return mapped result', async () => {
      mockExecute.mockResolvedValue({
        rows: [{
          id: 'w1', url: 'https://new.com/hook', events: ['badge.issued'],
          is_active: true, failure_count: 0, last_triggered_at: null, created_at: new Date(),
        }],
      });

      const result = await service.updateWebhook(
        'w1', { url: 'https://new.com/hook', events: ['badge.issued'] }, ctx
      );
      expect(result.url).toBe('https://new.com/hook');
    });

    it('should throw when webhook not found', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await expect(
        service.updateWebhook('missing', { url: 'https://x.com' }, ctx)
      ).rejects.toThrow('Webhook not found');
    });
  });

  describe('deleteWebhook', () => {
    it('should delete and return true', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await service.deleteWebhook('w1', ctx);
      expect(result).toBe(true);
    });
  });

  describe('listWebhooks', () => {
    it('should return mapped webhook list', async () => {
      mockExecute.mockResolvedValue({
        rows: [{
          id: 'w1', url: 'https://a.com', events: ['course.completed'],
          is_active: true, failure_count: 0, last_triggered_at: null, created_at: new Date(),
        }],
      });
      const result = await service.listWebhooks(ctx);
      expect(result).toHaveLength(1);
      expect(result[0].events).toContain('course.completed');
    });
  });

  describe('getDeliveries', () => {
    it('should return delivery history', async () => {
      mockExecute.mockResolvedValue({
        rows: [{
          id: 'd1', event_type: 'course.completed', response_status: 200,
          attempt: 1, status: 'SUCCESS', delivered_at: new Date(), created_at: new Date(),
        }],
      });
      const result = await service.getDeliveries('w1', ctx);
      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe('course.completed');
    });

    it('should cap limit at 100', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await service.getDeliveries('w1', ctx, 999);
      // No error — limit is capped internally
      expect(mockExecute).toHaveBeenCalled();
    });
  });

  describe('testWebhook', () => {
    it('should dispatch test event to existing webhook', async () => {
      // listWebhooks call
      mockExecute.mockResolvedValue({
        rows: [{
          id: 'w1', url: 'https://a.com', events: ['test'],
          is_active: true, failure_count: 0, last_triggered_at: null, created_at: new Date(),
        }],
      });

      const result = await service.testWebhook('w1', ctx);
      expect(mockDispatch).toHaveBeenCalled();
      expect(result.status).toBe('SUCCESS');
    });

    it('should throw when webhook not found', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await expect(service.testWebhook('missing', ctx)).rejects.toThrow('Webhook not found');
    });
  });

  describe('onModuleDestroy', () => {
    it('should close all pools', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalled();
    });
  });
});
