import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { LessonResolver } from './lesson.resolver';

// ─── Service mocks ────────────────────────────────────────────────────────────

const mockLessonService = {
  findById: vi.fn(),
  findByCourse: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  publish: vi.fn(),
};

const mockAssetService = {
  addAsset: vi.fn(),
  findByLesson: vi.fn(),
};

const mockPipelineService = {
  savePipeline: vi.fn(),
  startRun: vi.fn(),
  cancelRun: vi.fn(),
  findByLesson: vi.fn(),
  findRunById: vi.fn(),
  findResultsByRunId: vi.fn(),
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AUTH_CTX = {
  authContext: {
    userId: 'u-1',
    tenantId: 't-1',
    email: 'instructor@test.com',
    username: 'instructor',
    roles: ['INSTRUCTOR' as const],
    scopes: [],
    isSuperAdmin: false,
  },
};

const NO_AUTH_CTX = { authContext: undefined };

const MOCK_LESSON = {
  id: 'l-1',
  courseId: 'c-1',
  moduleId: null,
  title: 'Introduction',
  type: 'THEMATIC',
  series: null,
  lessonDate: null,
  instructorId: 'u-1',
  status: 'DRAFT',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LessonResolver', () => {
  let resolver: LessonResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new LessonResolver(
      mockLessonService as never,
      mockAssetService as never,
      mockPipelineService as never
    );
  });

  describe('getLesson()', () => {
    it('throws UnauthorizedException when authContext is missing', async () => {
      await expect(resolver.getLesson('l-1', NO_AUTH_CTX)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('delegates to lessonService.findById with correct id', async () => {
      mockLessonService.findById.mockResolvedValue(MOCK_LESSON);
      const result = await resolver.getLesson('l-1', AUTH_CTX);
      expect(mockLessonService.findById).toHaveBeenCalledWith(
        'l-1',
        expect.objectContaining({ tenantId: 't-1' })
      );
      expect(result).toEqual(MOCK_LESSON);
    });
  });

  describe('createLesson()', () => {
    it('throws UnauthorizedException when authContext is missing', async () => {
      const input = {
        courseId: 'c-1',
        title: 'New Lesson',
        type: 'THEMATIC' as const,
        instructorId: 'u-1',
      };
      await expect(resolver.createLesson(input, NO_AUTH_CTX)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('delegates to lessonService.create with the input', async () => {
      mockLessonService.create.mockResolvedValue(MOCK_LESSON);
      const input = {
        courseId: 'c-1',
        title: 'New Lesson',
        type: 'THEMATIC' as const,
        instructorId: 'u-1',
      };
      const result = await resolver.createLesson(input, AUTH_CTX);
      expect(mockLessonService.create).toHaveBeenCalledWith(
        input,
        expect.objectContaining({ tenantId: 't-1', userId: 'u-1' })
      );
      expect(result).toEqual(MOCK_LESSON);
    });
  });

  describe('publishLesson()', () => {
    it('throws UnauthorizedException when authContext is missing', async () => {
      await expect(resolver.publishLesson('l-1', NO_AUTH_CTX)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('delegates to lessonService.publish', async () => {
      const published = { ...MOCK_LESSON, status: 'PUBLISHED' };
      mockLessonService.publish.mockResolvedValue(published);
      const result = await resolver.publishLesson('l-1', AUTH_CTX);
      expect(mockLessonService.publish).toHaveBeenCalledWith(
        'l-1',
        expect.objectContaining({ tenantId: 't-1' })
      );
      expect(result?.status).toBe('PUBLISHED');
    });
  });

  describe('deleteLesson()', () => {
    it('throws UnauthorizedException when authContext is missing', async () => {
      await expect(resolver.deleteLesson('l-1', NO_AUTH_CTX)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('delegates to lessonService.delete', async () => {
      mockLessonService.delete.mockResolvedValue(true);
      const result = await resolver.deleteLesson('l-1', AUTH_CTX);
      expect(mockLessonService.delete).toHaveBeenCalledWith(
        'l-1',
        expect.objectContaining({ tenantId: 't-1' })
      );
      expect(result).toBe(true);
    });
  });

  describe('field resolvers', () => {
    it('getAssets() delegates to assetService.findByLesson', async () => {
      mockAssetService.findByLesson.mockResolvedValue([]);
      const result = await resolver.getAssets({ id: 'l-1' });
      expect(mockAssetService.findByLesson).toHaveBeenCalledWith('l-1');
      expect(result).toEqual([]);
    });

    it('getPipeline() delegates to pipelineService.findByLesson', async () => {
      mockPipelineService.findByLesson.mockResolvedValue(null);
      const result = await resolver.getPipeline({ id: 'l-1' });
      expect(mockPipelineService.findByLesson).toHaveBeenCalledWith('l-1');
      expect(result).toBeNull();
    });

    it('getCitations() returns empty array', async () => {
      const result = await resolver.getCitations({ id: 'l-1' });
      expect(result).toEqual([]);
    });
  });
});
