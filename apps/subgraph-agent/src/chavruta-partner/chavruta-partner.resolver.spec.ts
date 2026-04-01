/**
 * ChavrutaPartnerMatchResolver unit tests — GAP-3.
 *
 * Verifies:
 * - chavrutaPartnerMatches delegates to service.findPartnerForDebate
 * - myChavrutaPartnerSessions delegates to service.getMyPartnerSessions
 * - createChavrutaPartnerSession delegates to service.createPartnerSession
 * - All methods throw UnauthorizedException when userId or tenantId missing
 * - Auth context is correctly extracted and passed to service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ── Mock service ─────────────────────────────────────────────────────────────

const mockFindPartner = vi.hoisted(() => vi.fn());
const mockGetSessions = vi.hoisted(() => vi.fn());
const mockCreateSession = vi.hoisted(() => vi.fn());

vi.mock('./chavruta-partner.service', () => {
  class MockChavrutaPartnerMatchService {
    findPartnerForDebate(...args: unknown[]) {
      return mockFindPartner(...args);
    }
    getMyPartnerSessions(...args: unknown[]) {
      return mockGetSessions(...args);
    }
    createPartnerSession(...args: unknown[]) {
      return mockCreateSession(...args);
    }
  }
  return { ChavrutaPartnerMatchService: MockChavrutaPartnerMatchService };
});

import { ChavrutaPartnerMatchResolver } from './chavruta-partner.resolver';
import { ChavrutaPartnerMatchService } from './chavruta-partner.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeContext(
  overrides: Partial<{
    userId: string | null;
    tenantId: string | null;
  }> = {}
) {
  return {
    authContext: {
      userId: overrides.userId ?? 'user-1',
      tenantId: overrides.tenantId ?? 'tenant-1',
      role: 'STUDENT',
      scopes: [],
    },
  } as never;
}

function noAuthContext() {
  return { authContext: null } as never;
}

function noUserIdContext() {
  return {
    authContext: { userId: null, tenantId: 'tenant-1' },
  } as never;
}

function noTenantContext() {
  return {
    authContext: { userId: 'user-1', tenantId: null },
  } as never;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ChavrutaPartnerMatchResolver', () => {
  let resolver: ChavrutaPartnerMatchResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    const service =
      new ChavrutaPartnerMatchService() as unknown as ChavrutaPartnerMatchService;
    resolver = new ChavrutaPartnerMatchResolver(service);
  });

  // ── chavrutaPartnerMatches ────────────────────────────────────────────────

  it('delegates to service.findPartnerForDebate', async () => {
    const matches = [
      { partnerId: 'user-2', topic: 'Ethics', compatibilityScore: 0.85 },
    ];
    mockFindPartner.mockResolvedValueOnce(matches);

    const input = { courseId: 'course-1', preferredTopic: 'Ethics' };
    const result = await resolver.chavrutaPartnerMatches(input, makeContext());

    expect(mockFindPartner).toHaveBeenCalledWith('user-1', 'tenant-1', input);
    expect(result).toEqual(matches);
  });

  it('chavrutaPartnerMatches passes input without preferredTopic', async () => {
    mockFindPartner.mockResolvedValueOnce([]);

    const input = { courseId: 'course-1' };
    await resolver.chavrutaPartnerMatches(
      input as { courseId: string; preferredTopic?: string },
      makeContext()
    );

    expect(mockFindPartner).toHaveBeenCalledWith('user-1', 'tenant-1', input);
  });

  it('chavrutaPartnerMatches throws without auth', async () => {
    await expect(
      resolver.chavrutaPartnerMatches({ courseId: 'c1' }, noAuthContext())
    ).rejects.toThrow(UnauthorizedException);
  });

  it('chavrutaPartnerMatches throws when userId is null', async () => {
    await expect(
      resolver.chavrutaPartnerMatches({ courseId: 'c1' }, noUserIdContext())
    ).rejects.toThrow(UnauthorizedException);
  });

  it('chavrutaPartnerMatches throws when tenantId is null', async () => {
    await expect(
      resolver.chavrutaPartnerMatches({ courseId: 'c1' }, noTenantContext())
    ).rejects.toThrow(UnauthorizedException);
  });

  // ── myChavrutaPartnerSessions ─────────────────────────────────────────────

  it('delegates to service.getMyPartnerSessions', async () => {
    const sessions = [{ id: 'sess-1', topic: 'Free Will', status: 'ACTIVE' }];
    mockGetSessions.mockResolvedValueOnce(sessions);

    const result = await resolver.myChavrutaPartnerSessions(makeContext());

    expect(mockGetSessions).toHaveBeenCalledWith('user-1', 'tenant-1');
    expect(result).toEqual(sessions);
  });

  it('myChavrutaPartnerSessions throws without auth', async () => {
    await expect(
      resolver.myChavrutaPartnerSessions(noAuthContext())
    ).rejects.toThrow(UnauthorizedException);
  });

  // ── createChavrutaPartnerSession ──────────────────────────────────────────

  it('delegates to service.createPartnerSession', async () => {
    const created = {
      id: 'sess-new',
      status: 'PENDING',
      topic: 'Determinism',
    };
    mockCreateSession.mockResolvedValueOnce(created);

    const input = {
      partnerId: 'user-2',
      courseId: 'course-1',
      topic: 'Determinism',
    };
    const result = await resolver.createChavrutaPartnerSession(
      input,
      makeContext()
    );

    expect(mockCreateSession).toHaveBeenCalledWith(
      'user-1',
      'tenant-1',
      'user-2',
      'course-1',
      'Determinism'
    );
    expect(result).toEqual(created);
  });

  it('createChavrutaPartnerSession throws without auth', async () => {
    await expect(
      resolver.createChavrutaPartnerSession(
        { partnerId: 'u2', courseId: 'c1', topic: 't' },
        noAuthContext()
      )
    ).rejects.toThrow(UnauthorizedException);
  });

  it('propagates service errors', async () => {
    mockCreateSession.mockRejectedValueOnce(
      new Error('Insert returned no rows')
    );

    await expect(
      resolver.createChavrutaPartnerSession(
        { partnerId: 'u2', courseId: 'c1', topic: 't' },
        makeContext()
      )
    ).rejects.toThrow('Insert returned no rows');
  });
});
