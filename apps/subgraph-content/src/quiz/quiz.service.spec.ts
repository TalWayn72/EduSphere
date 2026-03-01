import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// vi.hoisted ensures these are initialized before vi.mock() hoisting runs
const { mockCloseAllPools, mockWithTenantContext, mockGrade, mockSafeParse } = vi.hoisted(() => ({
  mockCloseAllPools: vi.fn(),
  mockWithTenantContext: vi.fn(),
  mockGrade: vi.fn(),
  mockSafeParse: vi.fn(),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  schema: {
    contentItems: { id: 'id', type: 'type' },
    quizResults: {
      userId: 'userId',
      contentItemId: 'contentItemId',
      submittedAt: 'submittedAt',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: mockWithTenantContext,
}));

vi.mock('./quiz-grader.service.js', () => ({
  QuizGraderService: class {
    grade = mockGrade;
  },
}));

vi.mock('./quiz-schemas.js', () => ({
  QuizContentSchema: { safeParse: mockSafeParse },
}));

import { QuizService } from './quiz.service.js';
import { QuizGraderService } from './quiz-grader.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT_CTX = { tenantId: 'tenant-1', userId: 'user-1', userRole: 'STUDENT' as const };

const MOCK_QUIZ_CONTENT = {
  items: [
    {
      type: 'MULTIPLE_CHOICE',
      question: 'What is 2+2?',
      options: [{ id: 'a', text: '4' }],
      correctOptionIds: ['a'],
    },
  ],
  passingScore: 70,
  randomizeOrder: false,
  showExplanations: true,
};

const MOCK_GRADE_RESULT = {
  score: 100,
  passed: true,
  itemResults: [{ itemIndex: 0, correct: true, partialScore: 1 }],
};

const MOCK_SAVED_ROW = {
  id: 'result-uuid',
  score: 100,
  passed: true,
  answers: { 0: ['a'] },
  itemResults: [{ itemIndex: 0, correct: true, partialScore: 1 }],
  submittedAt: new Date('2026-02-01T10:00:00.000Z'),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQuizService(): QuizService {
  const grader = new QuizGraderService();
  return new QuizService(grader);
}

function setupWithTenantContextForLoad(contentItem: Record<string, unknown> | null): void {
  mockWithTenantContext.mockImplementationOnce(
    async (_db: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve(contentItem ? [contentItem] : []),
            }),
          }),
        }),
      };
      return cb(tx);
    }
  );
}

function setupWithTenantContextForInsert(savedRow: Record<string, unknown>): void {
  mockWithTenantContext.mockImplementationOnce(
    async (_db: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () => Promise.resolve([savedRow]),
          }),
        }),
      };
      return cb(tx);
    }
  );
}

function setupWithTenantContextForSelect(rows: Record<string, unknown>[]): void {
  mockWithTenantContext.mockImplementationOnce(
    async (_db: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: () => ({
              orderBy: () => Promise.resolve(rows),
            }),
          }),
        }),
      };
      return cb(tx);
    }
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuizService', () => {
  let service: QuizService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = makeQuizService();
  });

  // ── Memory safety ─────────────────────────────────────────────────────────

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools to release DB connections', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalledOnce();
    });

    it('resolves without throwing', async () => {
      mockCloseAllPools.mockResolvedValueOnce(undefined);
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  // ── gradeAndSave ──────────────────────────────────────────────────────────

  describe('gradeAndSave()', () => {
    it('throws NotFoundException when content item does not exist', async () => {
      setupWithTenantContextForLoad(null);

      await expect(
        service.gradeAndSave('missing-item', 'user-1', TENANT_CTX, { 0: ['a'] })
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when content item type is not QUIZ', async () => {
      setupWithTenantContextForLoad({ id: 'item-1', type: 'VIDEO', content: null });

      await expect(
        service.gradeAndSave('item-1', 'user-1', TENANT_CTX, { 0: ['a'] })
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when content item has no content', async () => {
      setupWithTenantContextForLoad({ id: 'item-1', type: 'QUIZ', content: null });

      await expect(
        service.gradeAndSave('item-1', 'user-1', TENANT_CTX, { 0: ['a'] })
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when content is not valid JSON', async () => {
      setupWithTenantContextForLoad({ id: 'item-1', type: 'QUIZ', content: '{invalid json' });

      await expect(
        service.gradeAndSave('item-1', 'user-1', TENANT_CTX, { 0: ['a'] })
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when content fails schema validation', async () => {
      setupWithTenantContextForLoad({
        id: 'item-1',
        type: 'QUIZ',
        content: JSON.stringify({ invalid: 'schema' }),
      });
      mockSafeParse.mockReturnValueOnce({ success: false, error: { message: 'Invalid quiz' } });

      await expect(
        service.gradeAndSave('item-1', 'user-1', TENANT_CTX, { 0: ['a'] })
      ).rejects.toThrow(BadRequestException);
    });

    it('grades, saves, and returns mapped result on success', async () => {
      setupWithTenantContextForLoad({
        id: 'item-1',
        type: 'QUIZ',
        content: JSON.stringify(MOCK_QUIZ_CONTENT),
      });
      mockSafeParse.mockReturnValueOnce({ success: true, data: MOCK_QUIZ_CONTENT });
      mockGrade.mockReturnValueOnce(MOCK_GRADE_RESULT);
      setupWithTenantContextForInsert(MOCK_SAVED_ROW);

      const result = await service.gradeAndSave('item-1', 'user-1', TENANT_CTX, { 0: ['a'] });

      expect(result).toMatchObject({
        id: 'result-uuid',
        score: 100,
        passed: true,
        submittedAt: '2026-02-01T10:00:00.000Z',
      });
      expect(mockGrade).toHaveBeenCalledWith(MOCK_QUIZ_CONTENT, { 0: ['a'] });
    });
  });

  // ── getMyResults ──────────────────────────────────────────────────────────

  describe('getMyResults()', () => {
    it('returns empty array when no results exist', async () => {
      setupWithTenantContextForSelect([]);

      const result = await service.getMyResults('user-1', TENANT_CTX, 'item-1');

      expect(result).toEqual([]);
    });

    it('maps DB rows to QuizResultMapped shape with ISO submittedAt', async () => {
      setupWithTenantContextForSelect([MOCK_SAVED_ROW]);

      const result = await service.getMyResults('user-1', TENANT_CTX, 'item-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'result-uuid',
        score: 100,
        passed: true,
        submittedAt: '2026-02-01T10:00:00.000Z',
      });
    });
  });
});
