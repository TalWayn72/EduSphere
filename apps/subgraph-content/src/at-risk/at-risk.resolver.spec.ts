import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: vi.fn(),
  withBypassRLS: vi.fn(),
}));
vi.mock('nats', () => ({
  connect: vi.fn(),
  StringCodec: vi.fn(() => ({ encode: vi.fn(), decode: vi.fn() })),
}));
vi.mock('@edusphere/auth', () => ({}));

import { AtRiskResolver } from './at-risk.resolver.js';
import type { AtRiskService } from './at-risk.service.js';

// ── Mock service ──────────────────────────────────────────────────────────────

const mockGetAtRiskLearners = vi.fn();
const mockDismissFlag = vi.fn();

const mockService = {
  getAtRiskLearners: mockGetAtRiskLearners,
  dismissFlag: mockDismissFlag,
} as unknown as AtRiskService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeCtx = (roles: string[] = ['INSTRUCTOR']) => ({
  authContext: { userId: 'u1', tenantId: 't1', roles },
});

const noAuthCtx = { authContext: undefined };

const AT_RISK_LEARNER = {
  id: 'flag-1',
  learnerId: 'learner-1',
  courseId: 'course-1',
  riskScore: 0.85,
  riskFactors: [
    { key: 'inactiveForDays', description: 'No activity for more than 7 days' },
  ],
  flaggedAt: '2026-01-10T08:00:00.000Z',
  daysSinceLastActivity: 10,
  progressPercent: 15,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AtRiskResolver', () => {
  let resolver: AtRiskResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new AtRiskResolver(mockService);
  });

  // ── getAtRiskLearners ────────────────────────────────────────────────────────

  describe('getAtRiskLearners', () => {
    it('returns learners for INSTRUCTOR role', async () => {
      mockGetAtRiskLearners.mockResolvedValueOnce([AT_RISK_LEARNER]);

      const result = await resolver.getAtRiskLearners(
        'course-1',
        makeCtx(['INSTRUCTOR'])
      );

      expect(result).toEqual([AT_RISK_LEARNER]);
      expect(mockGetAtRiskLearners).toHaveBeenCalledWith(
        'course-1',
        expect.objectContaining({
          tenantId: 't1',
          userId: 'u1',
          userRole: 'INSTRUCTOR',
        })
      );
    });

    it('throws UnauthorizedException when no auth', async () => {
      await expect(
        resolver.getAtRiskLearners('course-1', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
      expect(mockGetAtRiskLearners).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException for STUDENT role', async () => {
      await expect(
        resolver.getAtRiskLearners('course-1', makeCtx(['STUDENT']))
      ).rejects.toThrow(UnauthorizedException);
      expect(mockGetAtRiskLearners).not.toHaveBeenCalled();
    });

    it('allows ORG_ADMIN role', async () => {
      mockGetAtRiskLearners.mockResolvedValueOnce([]);

      await resolver.getAtRiskLearners('course-1', makeCtx(['ORG_ADMIN']));

      expect(mockGetAtRiskLearners).toHaveBeenCalledWith(
        'course-1',
        expect.objectContaining({ userRole: 'ORG_ADMIN' })
      );
    });

    it('allows SUPER_ADMIN role', async () => {
      mockGetAtRiskLearners.mockResolvedValueOnce([]);

      await resolver.getAtRiskLearners('course-1', makeCtx(['SUPER_ADMIN']));

      expect(mockGetAtRiskLearners).toHaveBeenCalledWith(
        'course-1',
        expect.objectContaining({ userRole: 'SUPER_ADMIN' })
      );
    });
  });

  // ── resolveAtRiskFlag ────────────────────────────────────────────────────────

  describe('resolveAtRiskFlag', () => {
    it('calls dismissFlag and returns its result', async () => {
      mockDismissFlag.mockResolvedValueOnce(true);

      const result = await resolver.resolveAtRiskFlag('flag-1', makeCtx());

      expect(result).toBe(true);
      expect(mockDismissFlag).toHaveBeenCalledWith(
        'flag-1',
        expect.objectContaining({ tenantId: 't1', userId: 'u1' })
      );
    });

    it('throws UnauthorizedException when no auth', async () => {
      await expect(
        resolver.resolveAtRiskFlag('flag-1', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
      expect(mockDismissFlag).not.toHaveBeenCalled();
    });
  });
});
