import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HrisSyncCron } from './hris-sync.cron.js';
import type { HrisIntegrationService } from './hris-integration.service.js';

const mockHrisService = {
  syncTenant: vi.fn().mockResolvedValue({ synced: 5, errors: 0 }),
} as unknown as HrisIntegrationService;

describe('HrisSyncCron', () => {
  let cron: HrisSyncCron;

  beforeEach(() => {
    vi.useFakeTimers();
    cron = new HrisSyncCron(mockHrisService);
  });

  afterEach(() => {
    cron.onModuleDestroy();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not schedule when HRIS_SYNC_ENABLED is not set', () => {
    delete process.env['HRIS_SYNC_ENABLED'];
    cron.onModuleInit();
    // No interval should be registered
    expect((cron as unknown as { intervalHandle: unknown }).intervalHandle).toBeNull();
  });

  it('schedules nightly sync when HRIS_SYNC_ENABLED=true', () => {
    process.env['HRIS_SYNC_ENABLED'] = 'true';
    cron.onModuleInit();
    // initTimeout should be set
    expect((cron as unknown as { initTimeout: unknown }).initTimeout).not.toBeNull();
    delete process.env['HRIS_SYNC_ENABLED'];
  });

  it('clears interval handle in onModuleDestroy', () => {
    process.env['HRIS_SYNC_ENABLED'] = 'true';
    cron.onModuleInit();
    cron.onModuleDestroy();
    expect((cron as unknown as { intervalHandle: unknown }).intervalHandle).toBeNull();
    expect((cron as unknown as { initTimeout: unknown }).initTimeout).toBeNull();
    delete process.env['HRIS_SYNC_ENABLED'];
  });

  it('runSync calls syncTenant for each config (no-op with empty config array)', async () => {
    await cron.runSync();
    expect(mockHrisService.syncTenant).not.toHaveBeenCalled();
  });

  it('memory leak: double-destroy is safe', () => {
    process.env['HRIS_SYNC_ENABLED'] = 'true';
    cron.onModuleInit();
    cron.onModuleDestroy();
    expect(() => cron.onModuleDestroy()).not.toThrow();
    delete process.env['HRIS_SYNC_ENABLED'];
  });
});
