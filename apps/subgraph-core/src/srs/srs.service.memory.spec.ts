/**
 * Memory leak tests for SrsService.
 *
 * Verifies that onModuleDestroy():
 *   1. Calls closeAllPools() to release DB connections
 *   2. Is idempotent (second call does not throw)
 *
 * Rule: every @Injectable() with createDatabaseConnection()
 * MUST implement OnModuleDestroy calling closeAllPools.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: { spacedRepetitionCards: {} },
  withTenantContext: vi.fn(),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  eq: vi.fn(),
  and: vi.fn(),
  lte: vi.fn(),
  sql: vi.fn(),
}));

import { SrsService } from './srs.service';

describe('SrsService — memory safety', () => {
  let service: SrsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SrsService();
  });

  it('calls closeAllPools() exactly once during onModuleDestroy', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — second destroy does not throw', async () => {
    await service.onModuleDestroy();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });

  it('implements OnModuleDestroy interface', () => {
    expect(typeof service.onModuleDestroy).toBe('function');
  });
});
