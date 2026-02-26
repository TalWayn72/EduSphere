/**
 * Memory safety tests for LtiService — F-018
 * Verifies: onModuleDestroy calls closeAllPools, nonce map bounded at 1000.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const closeAllPoolsMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn().mockReturnValue({}),
  schema: { ltiPlatforms: {}, ltiLaunches: {} },
  closeAllPools: closeAllPoolsMock,
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(),
}));

describe('LtiService memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('onModuleDestroy calls closeAllPools exactly once', async () => {
    const { LtiService } = await import('./lti.service');
    const service = new LtiService();
    await service.onModuleDestroy();
    expect(closeAllPoolsMock).toHaveBeenCalledTimes(1);
  });

  it('no open handles remain after onModuleDestroy (calls complete without hanging)', async () => {
    const { LtiService } = await import('./lti.service');
    const service = new LtiService();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('nonce map is bounded at MAX_NONCES=1000 (LRU eviction fires)', async () => {
    const { LtiService } = await import('./lti.service');
    const service = new LtiService();
    const storeNonce = (
      service as unknown as { storeNonce: (n: string, s: string) => void }
    ).storeNonce.bind(service);
    const getSize = service.getNonceMapSize.bind(service);

    // Insert 1001 nonces — map should cap at 1000 via LRU eviction
    for (let i = 0; i < 1001; i++) {
      storeNonce('nonce-' + i, 'state-' + i);
    }

    expect(getSize()).toBe(1000);
  });
});
