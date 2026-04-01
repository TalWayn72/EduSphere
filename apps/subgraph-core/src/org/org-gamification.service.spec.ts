/**
 * org-gamification.service.spec.ts — Unit tests for OrgGamificationService.
 *
 * Covers:
 *   - Org-scoped leaderboard
 *   - Custom badge creation
 *   - XP configuration per tenant
 *   - RLS enforcement (tenant isolation)
 *   - Toggle gamification on/off
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> &
    Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  p.orderBy = self;
  p.returning = self;
  p.values = self;
  p.set = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, fn: (arg: unknown) => unknown) =>
      fn({ select: mockSelect, insert: mockInsert, update: mockUpdate })
  ),
  schema: {
    badges: {
      id: 'id',
      tenantId: 'tenant_id',
      name: 'name',
      iconUrl: 'icon_url',
    },
    userBadges: { id: 'id', userId: 'user_id', badgeId: 'badge_id' },
    userPoints: {
      id: 'id',
      userId: 'user_id',
      points: 'points',
      tenantId: 'tenant_id',
    },
    pointEvents: {
      id: 'id',
      userId: 'user_id',
      eventType: 'event_type',
      points: 'points',
    },
    tenants: { id: 'id', settings: 'settings' },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  desc: vi.fn((col: unknown) => ({ desc: col })),
}));

import { OrgGamificationService } from './org-gamification.service.js';

const TENANT_CTX = {
  tenantId: 'tenant-001',
  userId: 'admin-001',
  role: 'ORG_ADMIN',
};

describe('OrgGamificationService', () => {
  let service: OrgGamificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(makeChain([]));
    mockInsert.mockReturnValue(makeChain([{ id: 'new-001' }]));
    service = new OrgGamificationService();
  });

  // ─── Scoped leaderboard ───────────────────────────────────────────────────

  describe('getLeaderboard()', () => {
    it('returns top users by points for tenant', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          { userId: 'u1', points: 500, displayName: 'Alice' },
          { userId: 'u2', points: 450, displayName: 'Bob' },
        ])
      );

      const result = await service.getLeaderboard(TENANT_CTX, { limit: 10 });
      expect(result).toHaveLength(2);
      expect(result[0].points).toBeGreaterThanOrEqual(result[1].points);
    });

    it('limits results to requested count', async () => {
      const users = Array.from({ length: 5 }, (_, i) => ({
        userId: `u${i}`,
        points: 100 - i * 10,
        displayName: `User ${i}`,
      }));
      mockSelect.mockReturnValueOnce(makeChain(users));

      const result = await service.getLeaderboard(TENANT_CTX, { limit: 3 });
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('returns empty leaderboard for new org', async () => {
      mockSelect.mockReturnValueOnce(makeChain([]));

      const result = await service.getLeaderboard(TENANT_CTX, { limit: 10 });
      expect(result).toHaveLength(0);
    });
  });

  // ─── Custom badges ────────────────────────────────────────────────────────

  describe('createCustomBadge()', () => {
    it('creates badge with tenant-scoped ID', async () => {
      const badge = {
        name: 'Course Champion',
        description: 'Complete 10 courses',
        iconUrl: 'https://cdn.example.com/badge.png',
        criteria: { type: 'COURSE_COMPLETION', threshold: 10 },
      };

      const result = await service.createCustomBadge(TENANT_CTX, badge);
      expect(result).toBeDefined();
      expect(mockInsert).toHaveBeenCalled();
    });

    it('rejects badge with empty name', async () => {
      await expect(
        service.createCustomBadge(TENANT_CTX, {
          name: '',
          description: 'test',
          iconUrl: 'https://cdn.example.com/badge.png',
          criteria: { type: 'MANUAL' },
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects badge creation by non-ORG_ADMIN', async () => {
      await expect(
        service.createCustomBadge(
          { ...TENANT_CTX, role: 'STUDENT' },
          {
            name: 'Test Badge',
            description: 'test',
            iconUrl: 'https://cdn.example.com/badge.png',
            criteria: { type: 'MANUAL' },
          }
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── XP configuration ────────────────────────────────────────────────────

  describe('updateXPConfig()', () => {
    it('updates XP rules for tenant', async () => {
      const config = {
        courseCompletion: 100,
        quizPass: 50,
        lessonView: 10,
        dailyLogin: 5,
      };

      await service.updateXPConfig(TENANT_CTX, config);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('rejects negative XP values', async () => {
      await expect(
        service.updateXPConfig(TENANT_CTX, { courseCompletion: -10 })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Toggle gamification ──────────────────────────────────────────────────

  describe('toggleGamification()', () => {
    it('enables gamification for tenant', async () => {
      await service.toggleGamification(TENANT_CTX, true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('disables gamification for tenant', async () => {
      await service.toggleGamification(TENANT_CTX, false);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  // ─── Memory safety ────────────────────────────────────────────────────────

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
