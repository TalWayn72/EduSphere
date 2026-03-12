/**
 * InstructorPayoutService — Phase 59 unit tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InstructorPayoutService } from './instructor-payout.service.js';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {
    instructorPayouts: {
      instructorId: 'instructor_id',
      tenantId: 'tenant_id',
      createdAt: 'created_at',
      $inferSelect: {},
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  desc: vi.fn((col) => col),
  withTenantContext: vi.fn(async (_db, _ctx, fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      select: () => ({
        from: () => ({ where: () => ({ orderBy: () => ({ limit: () => [] }) }) }),
      }),
    })
  ),
}));

const tenantCtx = { tenantId: 't-1', userId: 'u-1', userRole: 'INSTRUCTOR' as const };

describe('InstructorPayoutService', () => {
  let service: InstructorPayoutService;

  beforeEach(() => {
    vi.stubEnv('PAYOUT_CRON_ENABLED', 'false');
    service = new InstructorPayoutService();
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.unstubAllEnvs();
  });

  it('does NOT start cron when PAYOUT_CRON_ENABLED is falsy', () => {
    service.onModuleInit();
    expect((service as unknown as Record<string, unknown>).initTimeout).toBeNull();
  });

  it('starts cron when PAYOUT_CRON_ENABLED=true', () => {
    vi.useFakeTimers();
    vi.stubEnv('PAYOUT_CRON_ENABLED', 'true');
    service.onModuleInit();
    expect((service as unknown as Record<string, unknown>).initTimeout).not.toBeNull();
    vi.useRealTimers();
  });

  it('clears timers on onModuleDestroy', () => {
    vi.useFakeTimers();
    vi.stubEnv('PAYOUT_CRON_ENABLED', 'true');
    service.onModuleInit();
    service.onModuleDestroy();
    expect((service as unknown as Record<string, unknown>).initTimeout).toBeNull();
    expect((service as unknown as Record<string, unknown>).intervalHandle).toBeNull();
    vi.useRealTimers();
  });

  it('getPayoutHistory returns array for instructor', async () => {
    const result = await service.getPayoutHistory('u-1', tenantCtx);
    expect(Array.isArray(result)).toBe(true);
  });

  it('getAllPayouts returns array with optional month filter', async () => {
    const result = await service.getAllPayouts('2026-03', tenantCtx);
    expect(Array.isArray(result)).toBe(true);
  });
});
