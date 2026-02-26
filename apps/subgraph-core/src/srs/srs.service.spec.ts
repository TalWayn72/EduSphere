/**
 * Unit tests for SrsService.
 * DB and NATS are mocked — pure business logic tested.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const now = new Date('2026-02-24T10:00:00.000Z');
const yesterday = new Date('2026-02-23T00:00:00.000Z');
const tomorrow = new Date('2026-02-25T00:00:00.000Z');

const makeCard = (overrides: Record<string, unknown> = {}) => ({
  id: 'card-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  conceptName: 'Photosynthesis',
  dueDate: yesterday,
  intervalDays: 1,
  easeFactor: 2.5,
  repetitions: 0,
  lastReviewedAt: null,
  createdAt: now,
  ...overrides,
});

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockTx = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  schema: {
    spacedRepetitionCards: {
      id: 'id',
      userId: 'user_id',
      tenantId: 'tenant_id',
      dueDate: 'due_date',
    },
  },
  withTenantContext: vi.fn(async (_db, _ctx, fn) => fn(mockTx)),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => ({ and: args })),
  lte: vi.fn((col, val) => ({ lte: { col, val } })),
  sql: vi.fn(() => 'COUNT(*)'),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({ publish: vi.fn(), drain: vi.fn() }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

import { SrsService } from './srs.service';

describe('SrsService', () => {
  let service: SrsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SrsService();
  });

  describe('getDueReviews', () => {
    it('returns only cards with dueDate <= now', async () => {
      const dueCard = makeCard({ dueDate: yesterday });
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([dueCard]),
      };
      mockSelect.mockReturnValue(chain);

      const results = await service.getDueReviews('user-1', 'tenant-1', 10);
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('card-1');
    });

    it('returns empty array when no cards are due', async () => {
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockSelect.mockReturnValue(chain);

      const results = await service.getDueReviews('user-1', 'tenant-1');
      expect(results).toHaveLength(0);
    });
  });

  describe('createCard', () => {
    it('inserts a card with default SM-2 values', async () => {
      const newCard = makeCard({ dueDate: now });
      const chain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([newCard]),
      };
      mockInsert.mockReturnValue(chain);

      const result = await service.createCard(
        'user-1',
        'tenant-1',
        'Photosynthesis'
      );
      expect(result.conceptName).toBe('Photosynthesis');
      expect(result.intervalDays).toBe(1);
      expect(result.easeFactor).toBe(2.5);
      expect(result.repetitions).toBe(0);
    });
  });

  describe('submitReview', () => {
    it('applies SM-2 and updates card on quality >= 3', async () => {
      const existingCard = makeCard({ repetitions: 1, intervalDays: 1 });
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([existingCard]),
      };
      mockSelect.mockReturnValue(selectChain);

      const updatedCard = makeCard({
        repetitions: 2,
        intervalDays: 6,
        dueDate: tomorrow,
      });
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedCard]),
      };
      mockUpdate.mockReturnValue(updateChain);

      const result = await service.submitReview(
        'card-1',
        'user-1',
        'tenant-1',
        4
      );
      expect(result.repetitions).toBe(2);
      expect(result.intervalDays).toBe(6);
    });

    it('resets to interval=1 on quality < 3', async () => {
      const existingCard = makeCard({ repetitions: 3, intervalDays: 15 });
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([existingCard]),
      };
      mockSelect.mockReturnValue(selectChain);

      const resetCard = makeCard({ repetitions: 0, intervalDays: 1 });
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([resetCard]),
      };
      mockUpdate.mockReturnValue(updateChain);

      const result = await service.submitReview(
        'card-1',
        'user-1',
        'tenant-1',
        1
      );
      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(1);
    });

    it('throws RangeError for quality outside 0-5', async () => {
      await expect(
        service.submitReview('card-1', 'user-1', 'tenant-1', 7)
      ).rejects.toThrow(RangeError);
    });

    it('throws RangeError for negative quality', async () => {
      await expect(
        service.submitReview('card-1', 'user-1', 'tenant-1', -1)
      ).rejects.toThrow(RangeError);
    });
  });

  // ---------------------------------------------------------------------------
  // API alias delegation methods
  // ---------------------------------------------------------------------------

  describe('getDueCards', () => {
    it('delegates to getDueReviews and returns due cards', async () => {
      const dueCard = makeCard({ dueDate: yesterday });
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([dueCard]),
      };
      mockSelect.mockReturnValue(chain);

      const results = await service.getDueCards('tenant-1', 'user-1', 10);
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('card-1');
    });

    it('uses default limit of 20 when not provided', async () => {
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockSelect.mockReturnValue(chain);

      const results = await service.getDueCards('tenant-1', 'user-1');
      expect(results).toHaveLength(0);
      // limit(20) was called via delegation
      expect(chain.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('scheduleReview', () => {
    it('creates a card and returns it when no initialDueDate provided', async () => {
      const newCard = makeCard({ dueDate: now });
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([newCard]),
      };
      mockInsert.mockReturnValue(insertChain);

      const result = await service.scheduleReview(
        'tenant-1',
        'user-1',
        'Mitosis'
      );
      expect(result.conceptName).toBe('Photosynthesis'); // mocked card conceptName
      expect(result.id).toBe('card-1');
    });

    it('creates a card and patches dueDate when initialDueDate provided', async () => {
      const newCard = makeCard({ dueDate: now });
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([newCard]),
      };
      mockInsert.mockReturnValue(insertChain);

      const futureDate = new Date('2026-03-15T00:00:00.000Z');
      const updatedCard = makeCard({ dueDate: futureDate });
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedCard]),
      };
      mockUpdate.mockReturnValue(updateChain);

      const result = await service.scheduleReview(
        'tenant-1',
        'user-1',
        'Mitosis',
        futureDate
      );
      expect(mockUpdate).toHaveBeenCalled();
      expect(result.id).toBe('card-1');
    });
  });

  describe('recordReview', () => {
    it('delegates to submitReview and returns updated card', async () => {
      const existingCard = makeCard({ repetitions: 1, intervalDays: 1 });
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([existingCard]),
      };
      mockSelect.mockReturnValue(selectChain);

      const updatedCard = makeCard({
        repetitions: 2,
        intervalDays: 6,
        dueDate: tomorrow,
      });
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedCard]),
      };
      mockUpdate.mockReturnValue(updateChain);

      const result = await service.recordReview(
        'tenant-1',
        'user-1',
        'card-1',
        4
      );
      expect(result.repetitions).toBe(2);
      expect(result.intervalDays).toBe(6);
    });

    it('throws RangeError for invalid quality via recordReview', async () => {
      await expect(
        service.recordReview('tenant-1', 'user-1', 'card-1', 9)
      ).rejects.toThrow(RangeError);
    });
  });
});
