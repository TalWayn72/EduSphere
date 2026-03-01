import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
}));

import { ProgramResolver } from './program.resolver.js';
import type { ProgramService } from './program.service.js';

// ── Mock service ──────────────────────────────────────────────────────────────

const mockListPrograms = vi.fn();
const mockGetProgram = vi.fn();
const mockGetUserEnrollments = vi.fn();
const mockGetProgramProgress = vi.fn();
const mockCreateProgram = vi.fn();
const mockEnrollInProgram = vi.fn();

const mockService = {
  listPrograms: mockListPrograms,
  getProgram: mockGetProgram,
  getUserEnrollments: mockGetUserEnrollments,
  getProgramProgress: mockGetProgramProgress,
  createProgram: mockCreateProgram,
  enrollInProgram: mockEnrollInProgram,
} as unknown as ProgramService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_CTX = { userId: 'user-1', tenantId: 'tenant-1', roles: ['STUDENT'] };
const makeCtx = (auth = AUTH_CTX) => ({ authContext: auth });
const noAuthCtx = { authContext: undefined };

const MOCK_PROGRAM = {
  id: 'prog-1',
  title: 'Data Science Fundamentals',
  description: 'Learn the basics',
  requiredCourseIds: ['course-1', 'course-2'],
  published: false,
};

const MOCK_ENROLLMENT = {
  id: 'enroll-1',
  userId: 'user-1',
  programId: 'prog-1',
  enrolledAt: new Date('2026-01-01'),
};

const MOCK_PROGRESS = {
  programId: 'prog-1',
  completedCourses: 1,
  totalCourses: 2,
  percentComplete: 50,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProgramResolver', () => {
  let resolver: ProgramResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new ProgramResolver(mockService);
  });

  // ── programs ──────────────────────────────────────────────────────────────

  describe('programs()', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(resolver.programs(noAuthCtx)).rejects.toThrow(UnauthorizedException);
      expect(mockListPrograms).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({ userId: 'u1', tenantId: undefined as unknown as string, roles: [] });
      await expect(resolver.programs(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when userId is missing', async () => {
      const ctx = makeCtx({ userId: undefined as unknown as string, tenantId: 't1', roles: [] });
      await expect(resolver.programs(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to service.listPrograms with tenantId and userId', async () => {
      mockListPrograms.mockResolvedValueOnce([MOCK_PROGRAM]);

      const result = await resolver.programs(makeCtx());

      expect(mockListPrograms).toHaveBeenCalledWith('tenant-1', 'user-1');
      expect(result).toEqual([MOCK_PROGRAM]);
    });

    it('returns empty array when no programs exist', async () => {
      mockListPrograms.mockResolvedValueOnce([]);
      const result = await resolver.programs(makeCtx());
      expect(result).toEqual([]);
    });
  });

  // ── program ───────────────────────────────────────────────────────────────

  describe('program()', () => {
    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(resolver.program('prog-1', noAuthCtx)).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to service.getProgram with id, tenantId, userId', async () => {
      mockGetProgram.mockResolvedValueOnce(MOCK_PROGRAM);

      const result = await resolver.program('prog-1', makeCtx());

      expect(mockGetProgram).toHaveBeenCalledWith('prog-1', 'tenant-1', 'user-1');
      expect(result).toEqual(MOCK_PROGRAM);
    });
  });

  // ── myProgramEnrollments ──────────────────────────────────────────────────

  describe('myProgramEnrollments()', () => {
    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(resolver.myProgramEnrollments(noAuthCtx)).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to service.getUserEnrollments with userId and tenantId', async () => {
      mockGetUserEnrollments.mockResolvedValueOnce([MOCK_ENROLLMENT]);

      const result = await resolver.myProgramEnrollments(makeCtx());

      expect(mockGetUserEnrollments).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toEqual([MOCK_ENROLLMENT]);
    });

    it('returns empty array when user has no enrollments', async () => {
      mockGetUserEnrollments.mockResolvedValueOnce([]);
      const result = await resolver.myProgramEnrollments(makeCtx());
      expect(result).toEqual([]);
    });
  });

  // ── programProgress ───────────────────────────────────────────────────────

  describe('programProgress()', () => {
    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(resolver.programProgress('prog-1', noAuthCtx)).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to service.getProgramProgress with programId, userId, tenantId', async () => {
      mockGetProgramProgress.mockResolvedValueOnce(MOCK_PROGRESS);

      const result = await resolver.programProgress('prog-1', makeCtx());

      expect(mockGetProgramProgress).toHaveBeenCalledWith('prog-1', 'user-1', 'tenant-1');
      expect(result).toEqual(MOCK_PROGRESS);
    });
  });
});
