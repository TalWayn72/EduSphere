import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockWithTenantContext = vi.fn(async (_db, _ctx, fn: (tx: unknown) => unknown) => fn(mockTx));
const mockReturning = vi.fn();
const mockTx = {
  select: vi.fn(),
  insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: mockReturning })) })),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: mockReturning })) })) })),
  execute: vi.fn(),
};

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: mockWithTenantContext,
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  executeCypher: vi.fn().mockResolvedValue([]),
  peerMatchRequests: {
    id: 'id', tenantId: 'tenant_id', requesterId: 'requester_id',
    matchedUserId: 'matched_user_id', status: 'status',
  },
  eq: vi.fn((col, _val) => col),
  and: vi.fn((...args) => args),
  sql: vi.fn(),
}));

vi.mock('@edusphere/config', () => ({
  graphConfig: { graphName: 'edusphere_graph' },
}));

import { PeerMatchingService } from './peer-matching.service';

const TENANT = 'tenant-uuid';
const REQUESTER = 'requester-uuid';
const MATCHED = 'matched-uuid';
const REQUEST_ID = 'request-uuid';

describe('PeerMatchingService', () => {
  let service: PeerMatchingService;

  beforeEach(() => {
    service = new PeerMatchingService();
    vi.clearAllMocks();
  });

  it('onModuleDestroy — calls closeAllPools', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });

  it('findPeerMatches — returns array (may be empty fallback)', async () => {
    // AGE returns empty → fallback
    mockTx.execute.mockResolvedValueOnce({ rows: [] });
    mockWithTenantContext.mockImplementationOnce(async (_db, _ctx, fn: (tx: unknown) => unknown) =>
      fn(mockTx)
    );
    const result = await service.findPeerMatches(TENANT, REQUESTER);
    expect(Array.isArray(result)).toBe(true);
  });

  it('requestPeerMatch — throws if requester === matchedUserId', async () => {
    await expect(service.requestPeerMatch(TENANT, REQUESTER, REQUESTER)).rejects.toThrow(
      BadRequestException
    );
  });

  it('requestPeerMatch — creates record with correct tenant and requester', async () => {
    const newRequest = {
      id: REQUEST_ID, tenantId: TENANT, requesterId: REQUESTER,
      matchedUserId: MATCHED, status: 'PENDING',
    };
    mockReturning.mockResolvedValueOnce([newRequest]);

    const result = await service.requestPeerMatch(TENANT, REQUESTER, MATCHED);
    expect(result).toMatchObject({ tenantId: TENANT, requesterId: REQUESTER, status: 'PENDING' });
  });

  it('respondToPeerMatch — IDOR: rejects if not the matchedUserId', async () => {
    const request = { id: REQUEST_ID, requesterId: REQUESTER, matchedUserId: MATCHED };
    mockTx.select.mockReturnValueOnce({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([request]) })) })),
    });

    // USER is the requester, not the matched user — should be rejected
    await expect(service.respondToPeerMatch(TENANT, REQUESTER, REQUEST_ID, true)).rejects.toThrow(
      BadRequestException
    );
  });

  it('respondToPeerMatch — updates status to ACCEPTED when matchedUserId responds', async () => {
    const request = { id: REQUEST_ID, requesterId: REQUESTER, matchedUserId: MATCHED };
    const updated = { ...request, status: 'ACCEPTED' };
    mockReturning.mockResolvedValueOnce([updated]);
    mockTx.select.mockReturnValueOnce({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([request]) })) })),
    });

    const result = await service.respondToPeerMatch(TENANT, MATCHED, REQUEST_ID, true);
    expect(result.status).toBe('ACCEPTED');
  });
});
