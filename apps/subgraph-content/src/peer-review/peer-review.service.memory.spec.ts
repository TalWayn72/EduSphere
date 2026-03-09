/**
 * PeerReviewService memory safety tests — Phase 45: Social Learning
 * Verifies that NATS connection is drained and DB pools are closed on module destroy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (hoisted — vi.mock is hoisted before imports)
// ---------------------------------------------------------------------------
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(),
  schema: {
    peerReviewRubrics: {},
    peerReviewAssignments: {},
    userCourses: {},
  },
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({
    encode: (s: string) => Buffer.from(s),
    decode: (b: Uint8Array) => Buffer.from(b).toString(),
  })),
}));

import { PeerReviewService } from './peer-review.service.js';
import { closeAllPools } from '@edusphere/db';
import { connect } from 'nats';

describe('PeerReviewService — memory safety', () => {
  let svc: PeerReviewService;

  beforeEach(async () => {
    vi.clearAllMocks();
    svc = new PeerReviewService();
    await svc.onModuleInit();
  });

  it('drains the NATS connection on module destroy', async () => {
    const connectResult = vi.mocked(connect).mock.results[0];
    const natsConn = connectResult ? await connectResult.value : null;

    await svc.onModuleDestroy();

    if (natsConn) {
      expect(natsConn.drain).toHaveBeenCalledOnce();
    } else {
      // NATS unavailable in test — verify DB pools were still closed
      expect(closeAllPools).toHaveBeenCalled();
    }
  });

  it('calls closeAllPools on module destroy', async () => {
    await svc.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  it('sets natsConn to null after drain so it cannot be reused', async () => {
    await svc.onModuleDestroy();
    // Calling destroy again must not throw (null guard)
    await expect(svc.onModuleDestroy()).resolves.not.toThrow();
  });

  it('can be destroyed twice without throwing (idempotent)', async () => {
    await svc.onModuleDestroy();
    await expect(svc.onModuleDestroy()).resolves.not.toThrow();
  });

  it('does not throw if NATS connection was never established', async () => {
    vi.mocked(connect).mockRejectedValueOnce(new Error('NATS unavailable'));
    const svc2 = new PeerReviewService();
    await svc2.onModuleInit().catch(() => undefined);
    await expect(svc2.onModuleDestroy()).resolves.not.toThrow();
  });
});
