import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
  withTenantContext: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({ close: vi.fn(), drain: vi.fn(), publish: vi.fn() }),
  StringCodec: vi.fn(() => ({ encode: (s: string) => s })),
}));

vi.mock('@edusphere/nats-client', () => ({ buildNatsOptions: vi.fn(() => ({})) }));

import { PlagiarismResolver } from './plagiarism.resolver.js';
import type { SubmissionService } from './submission.service.js';
import type { PlagiarismService } from './plagiarism.service.js';

// ── Mock services ─────────────────────────────────────────────────────────────

const mockSubmitAssignment = vi.fn();
const mockGetMySubmissions = vi.fn();
const mockGetPlagiarismReport = vi.fn();

const mockSubmissionService = {
  submitAssignment: mockSubmitAssignment,
  getMySubmissions: mockGetMySubmissions,
  getPlagiarismReport: mockGetPlagiarismReport,
} as unknown as SubmissionService;

const mockPlagiarismService = {} as unknown as PlagiarismService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_CTX = { userId: 'user-1', tenantId: 'tenant-1', roles: ['STUDENT'] };
const makeCtx = (auth = AUTH_CTX) => ({ authContext: auth });
const noAuthCtx = { authContext: undefined };

const MOCK_SUBMISSION = {
  id: 'sub-1',
  contentItemId: 'item-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  textContent: 'My essay text',
  submittedAt: new Date('2026-01-15T10:00:00.000Z'),
  plagiarismScore: null,
};

const MOCK_REPORT = {
  submissionId: 'sub-1',
  score: 12.5,
  matches: [],
  generatedAt: new Date('2026-01-15T11:00:00.000Z'),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PlagiarismResolver', () => {
  let resolver: PlagiarismResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new PlagiarismResolver(mockSubmissionService, mockPlagiarismService);
  });

  // ── submitTextAssignment ──────────────────────────────────────────────────

  describe('submitTextAssignment()', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(
        resolver.submitTextAssignment('item-1', 'My essay', 'course-1', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
      expect(mockSubmitAssignment).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when userId is missing', async () => {
      const ctx = makeCtx({ userId: undefined as unknown as string, tenantId: 't1', roles: [] });
      await expect(
        resolver.submitTextAssignment('item-1', 'My essay', 'course-1', ctx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({ userId: 'u1', tenantId: undefined as unknown as string, roles: [] });
      await expect(
        resolver.submitTextAssignment('item-1', 'My essay', 'course-1', ctx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to submissionService.submitAssignment with correct args', async () => {
      mockSubmitAssignment.mockResolvedValueOnce(MOCK_SUBMISSION);

      const result = await resolver.submitTextAssignment(
        'item-1',
        'My essay text',
        'course-1',
        makeCtx()
      );

      expect(result).toEqual(MOCK_SUBMISSION);
      expect(mockSubmitAssignment).toHaveBeenCalledWith(
        'item-1',
        'user-1',
        'tenant-1',
        'course-1',
        'My essay text',
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' })
      );
    });
  });

  // ── mySubmissions ─────────────────────────────────────────────────────────

  describe('mySubmissions()', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(
        resolver.mySubmissions('item-1', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({ userId: 'u1', tenantId: undefined as unknown as string, roles: [] });
      await expect(resolver.mySubmissions('item-1', ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to submissionService.getMySubmissions with correct args', async () => {
      mockGetMySubmissions.mockResolvedValueOnce([MOCK_SUBMISSION]);

      const result = await resolver.mySubmissions('item-1', makeCtx());

      expect(result).toEqual([MOCK_SUBMISSION]);
      expect(mockGetMySubmissions).toHaveBeenCalledWith(
        'item-1',
        'user-1',
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' })
      );
    });
  });

  // ── submissionPlagiarismReport ────────────────────────────────────────────

  describe('submissionPlagiarismReport()', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(
        resolver.submissionPlagiarismReport('sub-1', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when userId or tenantId is missing', async () => {
      const ctx = makeCtx({ userId: 'u1', tenantId: undefined as unknown as string, roles: [] });
      await expect(
        resolver.submissionPlagiarismReport('sub-1', ctx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to submissionService.getPlagiarismReport with correct args', async () => {
      mockGetPlagiarismReport.mockResolvedValueOnce(MOCK_REPORT);

      const result = await resolver.submissionPlagiarismReport('sub-1', makeCtx());

      expect(result).toEqual(MOCK_REPORT);
      expect(mockGetPlagiarismReport).toHaveBeenCalledWith(
        'sub-1',
        'user-1',
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' })
      );
    });

    it('builds TenantContext using role from roles array', async () => {
      mockGetPlagiarismReport.mockResolvedValueOnce(MOCK_REPORT);
      const ctx = makeCtx({ userId: 'u1', tenantId: 't1', roles: ['INSTRUCTOR'] });

      await resolver.submissionPlagiarismReport('sub-1', ctx);

      const [, , tenantCtxArg] = mockGetPlagiarismReport.mock.calls[0];
      expect(tenantCtxArg.userRole).toBe('INSTRUCTOR');
    });
  });
});
