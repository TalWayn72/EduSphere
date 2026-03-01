import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
  withTenantContext: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
}));

import { QuizResolver } from './quiz.resolver.js';
import type { QuizService } from './quiz.service.js';

// ── Mock service ──────────────────────────────────────────────────────────────

const mockGradeAndSave = vi.fn();
const mockGetMyResults = vi.fn();

const mockService = {
  gradeAndSave: mockGradeAndSave,
  getMyResults: mockGetMyResults,
} as unknown as QuizService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_CTX = { userId: 'user-1', tenantId: 'tenant-1', roles: ['STUDENT'] };
const makeCtx = (auth = AUTH_CTX) => ({ authContext: auth });
const noAuthCtx = { authContext: undefined };

const MOCK_QUIZ_RESULT = {
  id: 'result-1',
  score: 80,
  passed: true,
  itemResults: [{ itemIndex: 0, correct: true, partialScore: 1 }],
  submittedAt: '2026-02-01T10:00:00.000Z',
};

const SAMPLE_ANSWERS = { 0: ['opt-a'], 1: 'Paris' };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuizResolver', () => {
  let resolver: QuizResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new QuizResolver(mockService);
  });

  // ── gradeQuizSubmission ───────────────────────────────────────────────────

  describe('gradeQuizSubmission()', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(
        resolver.gradeQuizSubmission('item-1', SAMPLE_ANSWERS, noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
      expect(mockGradeAndSave).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when userId is missing', async () => {
      const ctx = makeCtx({ userId: undefined as unknown as string, tenantId: 't1', roles: [] });
      await expect(
        resolver.gradeQuizSubmission('item-1', SAMPLE_ANSWERS, ctx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({ userId: 'u1', tenantId: undefined as unknown as string, roles: [] });
      await expect(
        resolver.gradeQuizSubmission('item-1', SAMPLE_ANSWERS, ctx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to service.gradeAndSave with correct args', async () => {
      mockGradeAndSave.mockResolvedValueOnce(MOCK_QUIZ_RESULT);

      const result = await resolver.gradeQuizSubmission('item-1', SAMPLE_ANSWERS, makeCtx());

      expect(result).toEqual(MOCK_QUIZ_RESULT);
      expect(mockGradeAndSave).toHaveBeenCalledWith(
        'item-1',
        'user-1',
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        SAMPLE_ANSWERS
      );
    });

    it('builds TenantContext with role from first roles entry', async () => {
      mockGradeAndSave.mockResolvedValueOnce(MOCK_QUIZ_RESULT);
      const ctx = makeCtx({ userId: 'u1', tenantId: 't1', roles: ['INSTRUCTOR'] });

      await resolver.gradeQuizSubmission('item-1', SAMPLE_ANSWERS, ctx);

      const [, , tenantCtxArg] = mockGradeAndSave.mock.calls[0];
      expect(tenantCtxArg.userRole).toBe('INSTRUCTOR');
    });

    it('defaults userRole to STUDENT when roles array is empty', async () => {
      mockGradeAndSave.mockResolvedValueOnce(MOCK_QUIZ_RESULT);
      const ctx = makeCtx({ userId: 'u1', tenantId: 't1', roles: [] });

      await resolver.gradeQuizSubmission('item-1', SAMPLE_ANSWERS, ctx);

      const [, , tenantCtxArg] = mockGradeAndSave.mock.calls[0];
      expect(tenantCtxArg.userRole).toBe('STUDENT');
    });
  });

  // ── myQuizResults ─────────────────────────────────────────────────────────

  describe('myQuizResults()', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(
        resolver.myQuizResults('item-1', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
      expect(mockGetMyResults).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({ userId: 'u1', tenantId: undefined as unknown as string, roles: [] });
      await expect(resolver.myQuizResults('item-1', ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to service.getMyResults with userId, tenantCtx, contentItemId', async () => {
      mockGetMyResults.mockResolvedValueOnce([MOCK_QUIZ_RESULT]);

      const result = await resolver.myQuizResults('item-1', makeCtx());

      expect(result).toEqual([MOCK_QUIZ_RESULT]);
      expect(mockGetMyResults).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        'item-1'
      );
    });
  });
});
