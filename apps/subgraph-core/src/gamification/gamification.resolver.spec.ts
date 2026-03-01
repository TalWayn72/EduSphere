import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('./badge.service.js', () => ({ BadgeService: vi.fn() }));
vi.mock('./open-badges.service.js', () => ({ OpenBadgesService: vi.fn() }));

import { GamificationResolver } from './gamification.resolver.js';

const CTX_AUTHED = {
  req: {},
  authContext: {
    tenantId: 'tenant-1',
    userId: 'user-1',
    roles: ['STUDENT'],
    scopes: [],
  },
};

const CTX_ANON = { req: {}, authContext: undefined };

/** Builds a minimal open badge row as returned by openBadgesService. */
function makeOpenBadgeRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-01-15T10:00:00Z');
  return {
    assertion: {
      id: 'assert-1',
      type: 'BadgeAssertion',
      issuedAt: now,
      expiresAt: null,
      revokedAt: null,
      proof: { type: 'Ed25519Signature2020' },
      ...overrides,
    },
    definition: {
      id: 'def-1',
      name: 'First Step',
      createdAt: now,
    },
  };
}

describe('GamificationResolver', () => {
  let resolver: GamificationResolver;
  let badgeService: {
    myBadges: ReturnType<typeof vi.fn>;
    leaderboard: ReturnType<typeof vi.fn>;
    myRank: ReturnType<typeof vi.fn>;
    myTotalPoints: ReturnType<typeof vi.fn>;
    adminBadges: ReturnType<typeof vi.fn>;
    createBadge: ReturnType<typeof vi.fn>;
    updateBadge: ReturnType<typeof vi.fn>;
    deleteBadge: ReturnType<typeof vi.fn>;
  };
  let openBadgesService: {
    myOpenBadges: ReturnType<typeof vi.fn>;
    verifyOpenBadge: ReturnType<typeof vi.fn>;
    issueBadge: ReturnType<typeof vi.fn>;
    revokeOpenBadge: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    badgeService = {
      myBadges: vi.fn(),
      leaderboard: vi.fn(),
      myRank: vi.fn(),
      myTotalPoints: vi.fn(),
      adminBadges: vi.fn(),
      createBadge: vi.fn(),
      updateBadge: vi.fn(),
      deleteBadge: vi.fn(),
    };
    openBadgesService = {
      myOpenBadges: vi.fn(),
      verifyOpenBadge: vi.fn(),
      issueBadge: vi.fn(),
      revokeOpenBadge: vi.fn(),
    };
    resolver = new GamificationResolver(
      badgeService as never,
      openBadgesService as never
    );
  });

  // ── getMyBadges ─────────────────────────────────────────────────────────────

  describe('getMyBadges()', () => {
    it('delegates to badgeService with userId and tenantId', async () => {
      badgeService.myBadges.mockResolvedValue([]);
      await resolver.getMyBadges(CTX_AUTHED);
      expect(badgeService.myBadges).toHaveBeenCalledWith('user-1', 'tenant-1');
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.getMyBadges(CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── getLeaderboard ──────────────────────────────────────────────────────────

  describe('getLeaderboard()', () => {
    it('delegates to badgeService with tenantId and limit', async () => {
      badgeService.leaderboard.mockResolvedValue([]);
      await resolver.getLeaderboard(25, CTX_AUTHED);
      expect(badgeService.leaderboard).toHaveBeenCalledWith('tenant-1', 25);
    });

    it('defaults limit to 10 when undefined', async () => {
      badgeService.leaderboard.mockResolvedValue([]);
      await resolver.getLeaderboard(undefined, CTX_AUTHED);
      expect(badgeService.leaderboard).toHaveBeenCalledWith('tenant-1', 10);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.getLeaderboard(10, CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── getMyRank ───────────────────────────────────────────────────────────────

  describe('getMyRank()', () => {
    it('delegates to badgeService with userId and tenantId', async () => {
      badgeService.myRank.mockResolvedValue(5);
      await resolver.getMyRank(CTX_AUTHED);
      expect(badgeService.myRank).toHaveBeenCalledWith('user-1', 'tenant-1');
    });
  });

  // ── getMyTotalPoints ────────────────────────────────────────────────────────

  describe('getMyTotalPoints()', () => {
    it('delegates to badgeService with userId and tenantId', async () => {
      badgeService.myTotalPoints.mockResolvedValue(450);
      const result = await resolver.getMyTotalPoints(CTX_AUTHED);
      expect(result).toBe(450);
      expect(badgeService.myTotalPoints).toHaveBeenCalledWith('user-1', 'tenant-1');
    });
  });

  // ── createBadge ─────────────────────────────────────────────────────────────

  describe('createBadge()', () => {
    it('delegates to badgeService with input and tenantId', async () => {
      const input = { name: 'Super Star', pointsReward: 200 } as never;
      badgeService.createBadge.mockResolvedValue({ id: 'badge-1' });
      await resolver.createBadge(input, CTX_AUTHED);
      expect(badgeService.createBadge).toHaveBeenCalledWith(input, 'tenant-1');
    });
  });

  // ── getMyOpenBadges ─────────────────────────────────────────────────────────

  describe('getMyOpenBadges()', () => {
    it('maps issuedAt and createdAt to ISO strings', async () => {
      const row = makeOpenBadgeRow();
      openBadgesService.myOpenBadges.mockResolvedValue([row]);
      const result = await resolver.getMyOpenBadges(CTX_AUTHED);
      expect(result[0]?.issuedAt).toBe('2026-01-15T10:00:00.000Z');
      expect(result[0]?.definition.createdAt).toBe('2026-01-15T10:00:00.000Z');
    });

    it('sets expiresAt to null when absent', async () => {
      openBadgesService.myOpenBadges.mockResolvedValue([makeOpenBadgeRow()]);
      const [badge] = await resolver.getMyOpenBadges(CTX_AUTHED);
      expect(badge?.expiresAt).toBeNull();
    });

    it('converts expiresAt to ISO string when present', async () => {
      const expiresAt = new Date('2027-01-01T00:00:00Z');
      const row = makeOpenBadgeRow({ expiresAt });
      openBadgesService.myOpenBadges.mockResolvedValue([row]);
      const [badge] = await resolver.getMyOpenBadges(CTX_AUTHED);
      expect(badge?.expiresAt).toBe('2027-01-01T00:00:00.000Z');
    });

    it('serialises vcDocument as JSON string', async () => {
      openBadgesService.myOpenBadges.mockResolvedValue([makeOpenBadgeRow()]);
      const [badge] = await resolver.getMyOpenBadges(CTX_AUTHED);
      expect(typeof badge?.vcDocument).toBe('string');
      const parsed = JSON.parse(badge!.vcDocument as string);
      expect(parsed).toHaveProperty('proof');
    });
  });

  // ── verifyOpenBadge ─────────────────────────────────────────────────────────

  describe('verifyOpenBadge()', () => {
    it('delegates to openBadgesService with assertionId', async () => {
      openBadgesService.verifyOpenBadge.mockResolvedValue({ valid: true });
      await resolver.verifyOpenBadge('assert-1', CTX_AUTHED);
      expect(openBadgesService.verifyOpenBadge).toHaveBeenCalledWith('assert-1');
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.verifyOpenBadge('assert-1', CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── issueBadge ──────────────────────────────────────────────────────────────

  describe('issueBadge()', () => {
    it('delegates to openBadgesService and maps dates', async () => {
      const row = makeOpenBadgeRow();
      openBadgesService.issueBadge.mockResolvedValue(row);
      const result = await resolver.issueBadge(
        'def-1', 'user-2', undefined, CTX_AUTHED
      );
      expect(openBadgesService.issueBadge).toHaveBeenCalledWith(
        'def-1', 'user-2', 'tenant-1', undefined
      );
      expect(result.issuedAt).toBe('2026-01-15T10:00:00.000Z');
    });
  });

  // ── revokeOpenBadge ─────────────────────────────────────────────────────────

  describe('revokeOpenBadge()', () => {
    it('delegates to openBadgesService with assertionId, tenantId and reason', async () => {
      openBadgesService.revokeOpenBadge.mockResolvedValue({ revoked: true });
      await resolver.revokeOpenBadge('assert-1', 'Violation', CTX_AUTHED);
      expect(openBadgesService.revokeOpenBadge).toHaveBeenCalledWith(
        'assert-1', 'tenant-1', 'Violation'
      );
    });
  });
});
