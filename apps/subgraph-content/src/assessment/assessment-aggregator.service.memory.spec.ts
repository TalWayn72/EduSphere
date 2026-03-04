/**
 * assessment-aggregator.service.memory.spec.ts
 * Memory safety: AssessmentAggregatorService calls closeAllPools() in onModuleDestroy().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: {
    assessmentCampaigns: {},
    assessmentResponses: {},
    assessmentResults: {},
  },
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) => fn({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { AssessmentAggregatorService } from './assessment-aggregator.service.js';

describe('AssessmentAggregatorService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs without errors', () => {
    expect(() => new AssessmentAggregatorService()).not.toThrow();
  });

  it('onModuleDestroy() calls closeAllPools()', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    const svc = new AssessmentAggregatorService();
    await svc.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy() is idempotent — safe to call multiple times', async () => {
    const svc = new AssessmentAggregatorService();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
  });
});
