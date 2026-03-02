import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

vi.mock('./srs.service', () => ({
  SrsService: vi.fn(),
}));

import { SrsResolver } from './srs.resolver.js';

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

describe('SrsResolver', () => {
  let resolver: SrsResolver;
  let srsService: {
    getDueReviews: ReturnType<typeof vi.fn>;
    getQueueCount: ReturnType<typeof vi.fn>;
    submitReview: ReturnType<typeof vi.fn>;
    createCard: ReturnType<typeof vi.fn>;
    getDueCards: ReturnType<typeof vi.fn>;
    scheduleReview: ReturnType<typeof vi.fn>;
    recordReview: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    srsService = {
      getDueReviews: vi.fn(),
      getQueueCount: vi.fn(),
      submitReview: vi.fn(),
      createCard: vi.fn(),
      getDueCards: vi.fn(),
      scheduleReview: vi.fn(),
      recordReview: vi.fn(),
    };
    resolver = new SrsResolver(srsService as never);
  });

  // ── getDueReviews ───────────────────────────────────────────────────────────

  describe('getDueReviews()', () => {
    it('delegates to service with userId, tenantId and limit', async () => {
      srsService.getDueReviews.mockResolvedValue([]);
      await resolver.getDueReviews(10, CTX_AUTHED);
      expect(srsService.getDueReviews).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
        10
      );
    });

    it('defaults limit to 20 when undefined', async () => {
      srsService.getDueReviews.mockResolvedValue([]);
      await resolver.getDueReviews(undefined, CTX_AUTHED);
      expect(srsService.getDueReviews).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
        20
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.getDueReviews(10, CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── getSrsQueueCount ────────────────────────────────────────────────────────

  describe('getSrsQueueCount()', () => {
    it('delegates to service and returns count', async () => {
      srsService.getQueueCount.mockResolvedValue(7);
      const result = await resolver.getSrsQueueCount(CTX_AUTHED);
      expect(result).toBe(7);
      expect(srsService.getQueueCount).toHaveBeenCalledWith(
        'user-1',
        'tenant-1'
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.getSrsQueueCount(CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── submitReview ────────────────────────────────────────────────────────────

  describe('submitReview()', () => {
    it('delegates to service with cardId, userId, tenantId and quality', async () => {
      srsService.submitReview.mockResolvedValue({ nextDue: '2026-03-08' });
      await resolver.submitReview('card-1', 4, CTX_AUTHED);
      expect(srsService.submitReview).toHaveBeenCalledWith(
        'card-1',
        'user-1',
        'tenant-1',
        4
      );
    });

    it('throws BadRequestException for quality > 5', async () => {
      await expect(
        resolver.submitReview('card-1', 6, CTX_AUTHED)
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for quality < 0', async () => {
      await expect(
        resolver.submitReview('card-1', -1, CTX_AUTHED)
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for non-integer quality', async () => {
      await expect(
        resolver.submitReview('card-1', 2.5, CTX_AUTHED)
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts quality 0', async () => {
      srsService.submitReview.mockResolvedValue({});
      await expect(
        resolver.submitReview('card-1', 0, CTX_AUTHED)
      ).resolves.not.toThrow();
    });

    it('accepts quality 5', async () => {
      srsService.submitReview.mockResolvedValue({});
      await expect(
        resolver.submitReview('card-1', 5, CTX_AUTHED)
      ).resolves.not.toThrow();
    });
  });

  // ── createReviewCard ────────────────────────────────────────────────────────

  describe('createReviewCard()', () => {
    it('delegates to service with trimmed conceptName', async () => {
      srsService.createCard.mockResolvedValue({ id: 'card-new' });
      await resolver.createReviewCard('  Photosynthesis  ', CTX_AUTHED);
      expect(srsService.createCard).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
        'Photosynthesis'
      );
    });

    it('throws BadRequestException for empty conceptName', async () => {
      await expect(
        resolver.createReviewCard('   ', CTX_AUTHED)
      ).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.createReviewCard('concept', CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── getDueCards ─────────────────────────────────────────────────────────────

  describe('getDueCards()', () => {
    it('delegates to service with tenantId, userId and limit', async () => {
      srsService.getDueCards.mockResolvedValue([]);
      await resolver.getDueCards(5, CTX_AUTHED);
      expect(srsService.getDueCards).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        5
      );
    });
  });

  // ── scheduleReview ──────────────────────────────────────────────────────────

  describe('scheduleReview()', () => {
    it('delegates to service with all params', async () => {
      srsService.scheduleReview.mockResolvedValue({ id: 'card-1' });
      await resolver.scheduleReview('Mitosis', '2026-03-10', 'SM2', CTX_AUTHED);
      expect(srsService.scheduleReview).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'Mitosis',
        '2026-03-10',
        'SM2'
      );
    });

    it('throws BadRequestException for empty conceptName', async () => {
      await expect(
        resolver.scheduleReview('  ', undefined, undefined, CTX_AUTHED)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── recordReview ────────────────────────────────────────────────────────────

  describe('recordReview()', () => {
    it('delegates to service with tenantId, userId, cardId and quality', async () => {
      srsService.recordReview.mockResolvedValue({ nextDue: '2026-04-01' });
      await resolver.recordReview('card-1', 3, CTX_AUTHED);
      expect(srsService.recordReview).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'card-1',
        3
      );
    });

    it('throws BadRequestException for invalid quality', async () => {
      await expect(
        resolver.recordReview('card-1', 99, CTX_AUTHED)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
