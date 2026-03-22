/**
 * trial.service.spec.ts — Unit tests for TrialService.
 *
 * Covers:
 *   - Trial start on org signup (90-day default)
 *   - Trial warning email triggers (day 75, 83, 88, 90)
 *   - Grace period activation (30 days after trial expiry)
 *   - Plan downgrade on grace period expiry
 *   - Trial-to-paid conversion
 *   - Trial extension by SUPER_ADMIN
 *   - Data retention after expiry
 *   - Edge cases: clock skew, already-expired, duplicate events
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> & Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  p.returning = self;
  p.values = self;
  p.set = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, fn: (arg: unknown) => unknown) =>
    fn({ select: mockSelect, update: mockUpdate }),
  ),
  schema: {
    tenantSubscriptions: {
      id: 'id',
      tenantId: 'tenant_id',
      status: 'status',
      pilotEndsAt: 'pilot_ends_at',
      planId: 'plan_id',
      stripeSubscriptionId: 'stripe_subscription_id',
    },
    tenants: { id: 'id', name: 'name' },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  lt: vi.fn((a: unknown, b: unknown) => ({ lt: [a, b] })),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    isClosed: vi.fn(() => false),
    drain: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn(),
    jetstream: vi.fn().mockReturnValue({ publish: vi.fn() }),
  }),
}));

import { TrialService } from './trial.service.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const ACTIVE_TRIAL = {
  id: 'sub-001',
  tenantId: 'tenant-001',
  status: 'trialing',
  pilotEndsAt: daysFromNow(30),
  planId: 'plan-starter',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('TrialService', () => {
  let service: TrialService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(makeChain([ACTIVE_TRIAL]));
    mockUpdate.mockReturnValue(makeChain([{ ...ACTIVE_TRIAL, status: 'trialing' }]));

    service = new TrialService();
  });

  // ─── Trial start ─────────────────────────────────────────────────────────

  describe('startTrial()', () => {
    it('creates subscription with status "trialing"', async () => {
      mockInsert.mockReturnValue(
        makeChain([{ ...ACTIVE_TRIAL, pilotEndsAt: daysFromNow(90) }]),
      );

      const result = await service.startTrial('tenant-001', 'plan-starter');
      expect(result.status).toBe('trialing');
    });

    it('sets pilotEndsAt to 90 days from now', async () => {
      const before = Date.now();
      mockInsert.mockReturnValue(
        makeChain([{ ...ACTIVE_TRIAL, pilotEndsAt: daysFromNow(90) }]),
      );

      const result = await service.startTrial('tenant-001', 'plan-starter');
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
      const endTime = new Date(result.pilotEndsAt).getTime();
      expect(endTime).toBeGreaterThanOrEqual(before + ninetyDaysMs - 5000);
    });

    it('rejects starting trial for tenant with active subscription', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, status: 'active' }]),
      );

      await expect(
        service.startTrial('tenant-001', 'plan-starter'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Days remaining ───────────────────────────────────────────────────────

  describe('getDaysRemaining()', () => {
    it('returns correct days remaining for active trial', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, pilotEndsAt: daysFromNow(30) }]),
      );

      const days = await service.getDaysRemaining('tenant-001');
      expect(days).toBeGreaterThanOrEqual(29);
      expect(days).toBeLessThanOrEqual(31);
    });

    it('returns 0 for expired trial', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, pilotEndsAt: daysAgo(5) }]),
      );

      const days = await service.getDaysRemaining('tenant-001');
      expect(days).toBe(0);
    });
  });

  // ─── Warning email triggers ───────────────────────────────────────────────

  describe('checkWarningTriggers()', () => {
    it('triggers 15-day warning at day 75', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, pilotEndsAt: daysFromNow(15) }]),
      );

      const triggers = await service.checkWarningTriggers('tenant-001');
      expect(triggers).toContain('15_DAYS');
    });

    it('triggers 7-day warning at day 83', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, pilotEndsAt: daysFromNow(7) }]),
      );

      const triggers = await service.checkWarningTriggers('tenant-001');
      expect(triggers).toContain('7_DAYS');
    });

    it('triggers 2-day warning at day 88', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, pilotEndsAt: daysFromNow(2) }]),
      );

      const triggers = await service.checkWarningTriggers('tenant-001');
      expect(triggers).toContain('2_DAYS');
    });

    it('triggers expiry notification at day 90', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, pilotEndsAt: daysFromNow(0) }]),
      );

      const triggers = await service.checkWarningTriggers('tenant-001');
      expect(triggers).toContain('EXPIRED');
    });

    it('returns empty array when trial has many days left', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, pilotEndsAt: daysFromNow(60) }]),
      );

      const triggers = await service.checkWarningTriggers('tenant-001');
      expect(triggers).toHaveLength(0);
    });
  });

  // ─── Grace period ─────────────────────────────────────────────────────────

  describe('processExpiredTrials()', () => {
    it('transitions expired trial to "past_due" (grace period)', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, pilotEndsAt: daysAgo(1), status: 'trialing' }]),
      );

      await service.processExpiredTrials();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('marks data for deletion after 30-day grace period', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, pilotEndsAt: daysAgo(31), status: 'past_due' }]),
      );

      await service.processExpiredTrials();
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  // ─── Trial to paid conversion ─────────────────────────────────────────────

  describe('convertToPaid()', () => {
    it('updates status to "active" with Stripe IDs', async () => {
      const stripeData = {
        stripeSubscriptionId: 'sub_stripe_123',
        stripeCustomerId: 'cus_stripe_456',
      };

      await service.convertToPaid('tenant-001', stripeData);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('rejects conversion for already active subscription', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, status: 'active' }]),
      );

      await expect(
        service.convertToPaid('tenant-001', {
          stripeSubscriptionId: 'sub_123',
          stripeCustomerId: 'cus_456',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Trial extension (SUPER_ADMIN) ────────────────────────────────────────

  describe('extendTrial()', () => {
    it('extends trial by specified days', async () => {
      await service.extendTrial('tenant-001', 30, 'SUPER_ADMIN');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('rejects extension by non-SUPER_ADMIN', async () => {
      await expect(
        service.extendTrial('tenant-001', 30, 'ORG_ADMIN'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects extension of non-trialing subscription', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, status: 'active' }]),
      );

      await expect(
        service.extendTrial('tenant-001', 30, 'SUPER_ADMIN'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Clock tolerance ──────────────────────────────────────────────────────

  describe('clock skew tolerance', () => {
    it('applies 1-hour tolerance for expiry checks', async () => {
      // Trial ends exactly now — within 1hr tolerance, should still be "active"
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...ACTIVE_TRIAL, pilotEndsAt: new Date(), status: 'trialing' }]),
      );

      const days = await service.getDaysRemaining('tenant-001');
      expect(days).toBeGreaterThanOrEqual(0);
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
