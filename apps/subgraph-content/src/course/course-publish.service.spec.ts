import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CoursePublishService } from './course-publish.service';

const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockDb = { update: mockUpdate, select: mockSelect };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    courses: { id: 'id', is_published: 'is_published' },
    lessons: {
      course_id: 'course_id',
      deleted_at: 'deleted_at',
      status: 'status',
    },
    lesson_pipeline_runs: { lesson_id: 'lesson_id' },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ and: c })),
  isNull: vi.fn((col) => ({ isNull: col })),
  count: vi.fn(() => 'count_agg'),
  withReadReplica: vi.fn((_fn) => _fn(mockDb)),
}));

function makeSelectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

function makeSelectChainNoLimit(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

describe('CoursePublishService', () => {
  let service: CoursePublishService;
  const findById = vi.fn();
  const mapCourse = vi.fn((c) => ({ ...c, mapped: true }));

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CoursePublishService();
  });

  describe('checkCourseReadiness()', () => {
    it('throws NotFoundException when course not found', async () => {
      findById.mockResolvedValue(null);
      await expect(
        service.checkCourseReadiness('no-course', findById),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns ready=false when title is missing', async () => {
      findById.mockResolvedValue({ title: '', description: 'desc' });
      const chain = makeSelectChainNoLimit([]);
      mockSelect.mockReturnValue({ from: chain.from });

      const result = await service.checkCourseReadiness('c1', findById);
      expect(result.ready).toBe(false);
      const titleCheck = result.checks.find((c) => c.name === 'has_title');
      expect(titleCheck?.passed).toBe(false);
    });

    it('returns ready=false when no lessons exist', async () => {
      findById.mockResolvedValue({ title: 'T', description: 'D' });
      const chain = makeSelectChainNoLimit([]);
      mockSelect.mockReturnValue({ from: chain.from });

      const result = await service.checkCourseReadiness('c1', findById);
      expect(result.ready).toBe(false);
      const lessonsCheck = result.checks.find((c) => c.name === 'has_lessons');
      expect(lessonsCheck?.passed).toBe(false);
    });

    it('returns ready=false when lessons are not READY/PUBLISHED', async () => {
      findById.mockResolvedValue({ title: 'T', description: 'D' });
      const lessonChain = makeSelectChainNoLimit([
        { id: 'l1', status: 'DRAFT' },
      ]);
      mockSelect.mockReturnValueOnce({ from: lessonChain.from });

      // pipeline run count query
      const countChain = makeSelectChain([{ cnt: 1 }]);
      mockSelect.mockReturnValueOnce({ from: countChain.from });

      const result = await service.checkCourseReadiness('c1', findById);
      const readyCheck = result.checks.find((c) => c.name === 'lessons_ready');
      expect(readyCheck?.passed).toBe(false);
    });

    it('returns ready=true when all checks pass', async () => {
      findById.mockResolvedValue({ title: 'Title', description: 'Desc' });
      const lessonChain = makeSelectChainNoLimit([
        { id: 'l1', status: 'READY' },
      ]);
      mockSelect.mockReturnValueOnce({ from: lessonChain.from });

      const countChain = makeSelectChain([{ cnt: 1 }]);
      mockSelect.mockReturnValueOnce({ from: countChain.from });

      const result = await service.checkCourseReadiness('c1', findById);
      expect(result.ready).toBe(true);
      expect(result.checks.every((c) => c.passed)).toBe(true);
    });

    it('returns has_pipeline_results=false when no runs', async () => {
      findById.mockResolvedValue({ title: 'T', description: 'D' });
      const lessonChain = makeSelectChainNoLimit([
        { id: 'l1', status: 'READY' },
      ]);
      mockSelect.mockReturnValueOnce({ from: lessonChain.from });

      const countChain = makeSelectChain([{ cnt: 0 }]);
      mockSelect.mockReturnValueOnce({ from: countChain.from });

      const result = await service.checkCourseReadiness('c1', findById);
      const pipeCheck = result.checks.find(
        (c) => c.name === 'has_pipeline_results',
      );
      expect(pipeCheck?.passed).toBe(false);
    });
  });

  describe('setPublished()', () => {
    it('publishes course when readiness passes', async () => {
      findById.mockResolvedValue({ title: 'T', description: 'D' });
      const lessonChain = makeSelectChainNoLimit([
        { id: 'l1', status: 'READY' },
      ]);
      mockSelect.mockReturnValueOnce({ from: lessonChain.from });
      const countChain = makeSelectChain([{ cnt: 1 }]);
      mockSelect.mockReturnValueOnce({ from: countChain.from });

      const returning = vi.fn().mockResolvedValue([{ id: 'c1', is_published: true }]);
      const where = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where });
      mockUpdate.mockReturnValue({ set });

      const result = await service.setPublished('c1', true, findById, mapCourse);
      expect(mapCourse).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 'c1', mapped: true });
    });

    it('throws BadRequestException when readiness fails on publish', async () => {
      findById.mockResolvedValue({ title: '', description: '' });
      const chain = makeSelectChainNoLimit([]);
      mockSelect.mockReturnValue({ from: chain.from });

      await expect(
        service.setPublished('c1', true, findById, mapCourse),
      ).rejects.toThrow(BadRequestException);
    });

    it('unpublishes without readiness check', async () => {
      const returning = vi.fn().mockResolvedValue([{ id: 'c1', is_published: false }]);
      const where = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where });
      mockUpdate.mockReturnValue({ set });

      const result = await service.setPublished('c1', false, findById, mapCourse);
      expect(findById).not.toHaveBeenCalled();
      expect(result).toMatchObject({ id: 'c1', mapped: true });
    });

    it('throws BadRequestException when DB update fails', async () => {
      findById.mockResolvedValue({ title: 'T', description: 'D' });
      const lessonChain = makeSelectChainNoLimit([{ id: 'l1', status: 'READY' }]);
      mockSelect.mockReturnValueOnce({ from: lessonChain.from });
      const countChain = makeSelectChain([{ cnt: 1 }]);
      mockSelect.mockReturnValueOnce({ from: countChain.from });

      mockUpdate.mockImplementation(() => {
        throw new Error('DB error');
      });

      await expect(
        service.setPublished('c1', true, findById, mapCourse),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
