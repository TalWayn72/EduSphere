import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// ── Hoisted mocks (vi.hoisted prevents TDZ issues) ───────────────────────────
const mockReturning = vi.hoisted(() => vi.fn());
const mockTx = vi.hoisted(() => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue([]),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: mockReturning,
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: mockReturning,
      })),
    })),
  })),
  execute: vi.fn(),
}));

const mockWithTenantContext = vi.hoisted(() =>
  vi.fn(async (_db: unknown, _ctx: unknown, fn: (tx: typeof mockTx) => unknown) =>
    fn(mockTx)
  )
);

const mockExecuteCypher = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: mockWithTenantContext,
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  executeCypher: mockExecuteCypher,
  peerMatchRequests: {
    id: 'id',
    tenantId: 'tenant_id',
    requesterId: 'requester_id',
    matchedUserId: 'matched_user_id',
    status: 'status',
  },
  userCourses: { userId: 'user_id', courseId: 'course_id' },
  eq: vi.fn((col: unknown) => col),
  and: vi.fn((...args: unknown[]) => args),
  ne: vi.fn((col: unknown) => col),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
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
    mockExecuteCypher.mockResolvedValue([]);
    mockWithTenantContext.mockImplementation(
      async (_db: unknown, _ctx: unknown, fn: (tx: typeof mockTx) => unknown) =>
        fn(mockTx)
    );
    mockTx.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    });
  });

  it('onModuleDestroy — calls closeAllPools', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });

  it('findPeerMatches — returns array (may be empty fallback)', async () => {
    mockTx.execute.mockResolvedValueOnce({ rows: [] });
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
      id: REQUEST_ID,
      tenantId: TENANT,
      requesterId: REQUESTER,
      matchedUserId: MATCHED,
      status: 'PENDING',
    };
    mockReturning.mockResolvedValueOnce([newRequest]);

    const result = await service.requestPeerMatch(TENANT, REQUESTER, MATCHED);
    expect(result).toMatchObject({ tenantId: TENANT, requesterId: REQUESTER, status: 'PENDING' });
  });

  it('respondToPeerMatch — throws NotFoundException when request not found', async () => {
    mockTx.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    });
    await expect(
      service.respondToPeerMatch(TENANT, REQUESTER, REQUEST_ID, true)
    ).rejects.toThrow(NotFoundException);
  });

  it('respondToPeerMatch — IDOR: rejects if not the matchedUserId', async () => {
    const request = { id: REQUEST_ID, requesterId: REQUESTER, matchedUserId: MATCHED };
    mockTx.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([request]),
        })),
      })),
    });

    // REQUESTER tries to respond, but matchedUserId is MATCHED — should be rejected
    await expect(service.respondToPeerMatch(TENANT, REQUESTER, REQUEST_ID, true)).rejects.toThrow(
      BadRequestException
    );
  });

  it('respondToPeerMatch — updates status to ACCEPTED when matchedUserId responds', async () => {
    const request = { id: REQUEST_ID, requesterId: REQUESTER, matchedUserId: MATCHED };
    const updated = { ...request, status: 'ACCEPTED' };
    mockTx.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([request]),
        })),
      })),
    });
    mockReturning.mockResolvedValueOnce([updated]);

    const result = await service.respondToPeerMatch(TENANT, MATCHED, REQUEST_ID, true);
    expect(result.status).toBe('ACCEPTED');
  });
});
