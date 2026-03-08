import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    execute: vi.fn(),
    transaction: vi.fn(),
  })),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
    { raw: vi.fn((s: string) => s) },
  ),
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) => {
    const { createDatabaseConnection } = await import('@edusphere/db');
    const mockDb = (createDatabaseConnection as ReturnType<typeof vi.fn>)();
    return fn(mockDb);
  }),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { OnboardingService } from './onboarding.service';
import { createDatabaseConnection, withTenantContext, closeAllPools } from '@edusphere/db';

describe('OnboardingService', () => {
  let service: OnboardingService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = (createDatabaseConnection as ReturnType<typeof vi.fn>)();
    service = new OnboardingService();
  });

  it('creates initial state when user has none', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) => {
      mockDb.execute = vi.fn()
        .mockResolvedValueOnce([]) // no existing state
        .mockResolvedValueOnce([]); // insert
      return fn(mockDb);
    });

    const result = await service.getState('user-1', 'tenant-1', 'student');
    expect(result.currentStep).toBe(1);
    expect(result.completed).toBe(false);
    expect(withTenantContext).toHaveBeenCalled();
  });

  it('returns existing state', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) => {
      mockDb.execute = vi.fn().mockResolvedValueOnce([{
        user_id: 'user-1', tenant_id: 'tenant-1', role: 'student',
        current_step: 3, total_steps: 5, completed: false, skipped: false, data: {},
      }]);
      return fn(mockDb);
    });

    const result = await service.getState('user-1', 'tenant-1', 'student');
    expect(result.currentStep).toBe(3);
  });

  it('instructor gets 4 total steps on initial creation', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) => {
      mockDb.execute = vi.fn()
        .mockResolvedValueOnce([]) // no existing
        .mockResolvedValueOnce([]); // insert
      return fn(mockDb);
    });

    const result = await service.getState('instructor-1', 'tenant-1', 'instructor');
    expect(result.totalSteps).toBe(4);
  });

  it('marks state as completed', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) => {
      mockDb.execute = vi.fn().mockResolvedValueOnce([{
        user_id: 'user-1', tenant_id: 'tenant-1', role: 'student',
        current_step: 5, total_steps: 5, completed: true, skipped: false, data: {},
      }]);
      return fn(mockDb);
    });

    const result = await service.completeOnboarding('user-1', 'tenant-1', 'student');
    expect(result.completed).toBe(true);
  });

  it('marks state as skipped', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) => {
      mockDb.execute = vi.fn().mockResolvedValueOnce([{
        user_id: 'user-1', tenant_id: 'tenant-1', role: 'student',
        current_step: 1, total_steps: 5, completed: false, skipped: true, data: {},
      }]);
      return fn(mockDb);
    });

    const result = await service.skipOnboarding('user-1', 'tenant-1', 'student');
    expect(result.skipped).toBe(true);
  });

  it('calls closeAllPools on destroy', () => {
    service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });
});
