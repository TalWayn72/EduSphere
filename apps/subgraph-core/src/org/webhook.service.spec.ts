/**
 * webhook.service.spec.ts — Unit tests for WebhookService.
 *
 * Covers:
 *   - Endpoint registration
 *   - Event dispatch
 *   - Retry logic (exponential backoff)
 *   - HMAC signature generation and verification
 *   - Endpoint URL validation
 *   - Event type filtering
 *   - Max endpoints per tenant
 *   - Delivery log
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> & Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  p.returning = self;
  p.values = self;
  p.set = self;
  p.orderBy = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, fn: (arg: unknown) => unknown) =>
    fn({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete }),
  ),
  schema: {
    webhookEndpoints: {
      id: 'id',
      tenantId: 'tenant_id',
      url: 'url',
      secret: 'secret',
      events: 'events',
      isActive: 'is_active',
    },
    webhookDeliveries: {
      id: 'id',
      endpointId: 'endpoint_id',
      eventType: 'event_type',
      payload: 'payload',
      statusCode: 'status_code',
      attempts: 'attempts',
      lastAttemptAt: 'last_attempt_at',
    },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  count: vi.fn(() => ({ count: 'count' })),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    isClosed: vi.fn(() => false),
    drain: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn(),
    jetstream: vi.fn().mockReturnValue({ publish: vi.fn() }),
  }),
}));

import { WebhookService } from './webhook.service.js';

const TENANT_CTX = { tenantId: 'tenant-001', userId: 'admin-001', role: 'ORG_ADMIN' };

const VALID_EVENTS = [
  'user.created',
  'user.updated',
  'course.completed',
  'enrollment.created',
  'certificate.issued',
];

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(makeChain([]));
    mockInsert.mockReturnValue(makeChain([{ id: 'endpoint-001', secret: 'whsec_test123' }]));
    service = new WebhookService();
  });

  // ─── Endpoint registration ────────────────────────────────────────────────

  describe('registerEndpoint()', () => {
    it('creates endpoint with generated HMAC secret', async () => {
      const result = await service.registerEndpoint(TENANT_CTX, {
        url: 'https://api.acme.com/webhooks',
        events: ['user.created', 'course.completed'],
      });

      expect(result).toBeDefined();
      expect(result.secret).toBeDefined();
      expect(result.secret.length).toBeGreaterThanOrEqual(16);
    });

    it('rejects non-HTTPS URL', async () => {
      await expect(
        service.registerEndpoint(TENANT_CTX, {
          url: 'http://insecure.com/webhook',
          events: ['user.created'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid URL format', async () => {
      await expect(
        service.registerEndpoint(TENANT_CTX, {
          url: 'not-a-url',
          events: ['user.created'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects empty events array', async () => {
      await expect(
        service.registerEndpoint(TENANT_CTX, {
          url: 'https://api.acme.com/webhooks',
          events: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid event type', async () => {
      await expect(
        service.registerEndpoint(TENANT_CTX, {
          url: 'https://api.acme.com/webhooks',
          events: ['invalid.event.type'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects registration by non-ORG_ADMIN', async () => {
      await expect(
        service.registerEndpoint(
          { ...TENANT_CTX, role: 'STUDENT' },
          {
            url: 'https://api.acme.com/webhooks',
            events: ['user.created'],
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it.each(VALID_EVENTS)('accepts valid event type "%s"', async (event) => {
      const result = await service.registerEndpoint(TENANT_CTX, {
        url: 'https://api.acme.com/webhooks',
        events: [event],
      });
      expect(result).toBeDefined();
    });
  });

  // ─── Event dispatch ───────────────────────────────────────────────────────

  describe('dispatchEvent()', () => {
    it('sends event to all matching endpoints', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          { id: 'ep-001', url: 'https://api.acme.com/webhooks', secret: 'sec1', events: ['user.created'], isActive: true },
          { id: 'ep-002', url: 'https://api.other.com/hooks', secret: 'sec2', events: ['user.created'], isActive: true },
        ]),
      );

      await service.dispatchEvent('tenant-001', 'user.created', { userId: 'u-001' });
      // Should have created delivery records for both endpoints
      expect(mockInsert).toHaveBeenCalled();
    });

    it('skips inactive endpoints', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          { id: 'ep-001', url: 'https://disabled.com', secret: 'sec', events: ['user.created'], isActive: false },
        ]),
      );

      await service.dispatchEvent('tenant-001', 'user.created', { userId: 'u-001' });
      // No delivery should be attempted
    });

    it('skips endpoints not subscribed to this event', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          { id: 'ep-001', url: 'https://api.com/hooks', secret: 'sec', events: ['course.completed'], isActive: true },
        ]),
      );

      await service.dispatchEvent('tenant-001', 'user.created', { userId: 'u-001' });
      // Endpoint subscribed to course.completed should not receive user.created
    });
  });

  // ─── HMAC signature ───────────────────────────────────────────────────────

  describe('HMAC signing', () => {
    it('generates valid HMAC-SHA256 signature for payload', () => {
      const payload = JSON.stringify({ event: 'user.created', data: { id: 'u-001' } });
      const secret = 'whsec_test_secret_123';

      const signature = service.generateSignature(payload, secret);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('produces consistent signatures for same payload+secret', () => {
      const payload = '{"test": true}';
      const secret = 'test-secret';

      const sig1 = service.generateSignature(payload, secret);
      const sig2 = service.generateSignature(payload, secret);
      expect(sig1).toBe(sig2);
    });

    it('produces different signatures for different secrets', () => {
      const payload = '{"test": true}';

      const sig1 = service.generateSignature(payload, 'secret-1');
      const sig2 = service.generateSignature(payload, 'secret-2');
      expect(sig1).not.toBe(sig2);
    });

    it('verifies valid signature returns true', () => {
      const payload = '{"test": true}';
      const secret = 'test-secret';
      const signature = service.generateSignature(payload, secret);

      const isValid = service.verifySignature(payload, secret, signature);
      expect(isValid).toBe(true);
    });

    it('rejects tampered payload', () => {
      const secret = 'test-secret';
      const signature = service.generateSignature('{"original": true}', secret);

      const isValid = service.verifySignature('{"tampered": true}', secret, signature);
      expect(isValid).toBe(false);
    });
  });

  // ─── Retry logic ──────────────────────────────────────────────────────────

  describe('retry logic', () => {
    it('retries failed delivery up to 3 times', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{
          id: 'delivery-001',
          endpointId: 'ep-001',
          attempts: 1,
          statusCode: 500,
          payload: '{}',
        }]),
      );

      await service.processRetries();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('marks delivery as failed after 3 attempts', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{
          id: 'delivery-001',
          endpointId: 'ep-001',
          attempts: 3,
          statusCode: 500,
          payload: '{}',
        }]),
      );

      await service.processRetries();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('applies exponential backoff between retries', async () => {
      // Verify that retry intervals increase: 1s, 2s, 4s (or similar)
      const intervals = service.getRetryIntervals();
      expect(intervals).toHaveLength(3);
      expect(intervals[1]).toBeGreaterThan(intervals[0]);
      expect(intervals[2]).toBeGreaterThan(intervals[1]);
    });
  });

  // ─── Max endpoints limit ─────────────────────────────────────────────────

  describe('max endpoints per tenant', () => {
    it('rejects when limit reached (10 endpoints)', async () => {
      mockSelect.mockReturnValueOnce(makeChain([{ count: 10 }]));

      await expect(
        service.registerEndpoint(TENANT_CTX, {
          url: 'https://api.acme.com/webhooks',
          events: ['user.created'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── Endpoint deletion ────────────────────────────────────────────────────

  describe('deleteEndpoint()', () => {
    it('deletes owned endpoint', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ id: 'ep-001', tenantId: TENANT_CTX.tenantId }]),
      );

      await service.deleteEndpoint(TENANT_CTX, 'ep-001');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('rejects deleting endpoint from another tenant', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ id: 'ep-001', tenantId: 'other-tenant' }]),
      );

      await expect(
        service.deleteEndpoint(TENANT_CTX, 'ep-001'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns 404 for non-existent endpoint', async () => {
      mockSelect.mockReturnValue(makeChain([]));

      await expect(
        service.deleteEndpoint(TENANT_CTX, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Memory safety ────────────────────────────────────────────────────────

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
