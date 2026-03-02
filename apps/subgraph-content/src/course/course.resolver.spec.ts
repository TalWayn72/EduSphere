import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { CourseResolver } from './course.resolver';

const mockCourseService = {
  findById: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setPublished: vi.fn(),
  delete: vi.fn(),
};

const mockEnrollmentService = {
  enrollCourse: vi.fn(),
  unenrollCourse: vi.fn(),
  getMyEnrollments: vi.fn(),
  getCourseProgress: vi.fn(),
  markContentViewed: vi.fn(),
};

const mockModuleService = {
  findByCourse: vi.fn(),
};

const MOCK_COURSE = {
  id: 'course-1',
  tenant_id: 'tenant-1',
  title: 'Test Course',
  description: 'A test course',
  creator_id: 'user-1',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const MOCK_ENROLLMENT = {
  id: 'enroll-1',
  courseId: 'course-1',
  userId: 'user-1',
  status: 'ACTIVE',
  enrolledAt: new Date('2026-01-01').toISOString(),
  completedAt: null,
};

const AUTH_CTX = {
  authContext: {
    userId: 'user-1',
    tenantId: 'tenant-1',
    email: 'user@test.com',
    username: 'user',
    roles: ['STUDENT' as const],
    scopes: [],
    isSuperAdmin: false,
  },
};

const NO_AUTH_CTX = { authContext: undefined };

describe('CourseResolver', () => {
  let resolver: CourseResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    resolver = new CourseResolver(
      mockCourseService as any,
      mockEnrollmentService as any,
      mockModuleService as any
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });

  describe('health()', () => {
    it('returns ok', () => {
      expect(resolver.health()).toBe('ok');
    });
  });

  describe('getCourse()', () => {
    it('delegates to service.findById with the given id', async () => {
      mockCourseService.findById.mockResolvedValue(MOCK_COURSE);
      const result = await resolver.getCourse('course-1');
      expect(mockCourseService.findById).toHaveBeenCalledWith('course-1');
      expect(result).toEqual(MOCK_COURSE);
    });

    it('returns null when course not found', async () => {
      mockCourseService.findById.mockResolvedValue(null);
      expect(await resolver.getCourse('nope')).toBeNull();
    });
  });

  describe('getCourses()', () => {
    it('delegates to service.findAll with limit and offset', async () => {
      mockCourseService.findAll.mockResolvedValue([MOCK_COURSE]);
      const result = await resolver.getCourses(10, 0);
      expect(mockCourseService.findAll).toHaveBeenCalledWith(10, 0);
      expect(result).toEqual([MOCK_COURSE]);
    });

    it('returns empty array when no courses', async () => {
      mockCourseService.findAll.mockResolvedValue([]);
      expect(await resolver.getCourses(10, 0)).toEqual([]);
    });
  });

  describe('createCourse()', () => {
    it('delegates to service.create and returns new course', async () => {
      mockCourseService.create.mockResolvedValue(MOCK_COURSE);
      const input = { title: 'New', instructorId: 'u-1' };
      const result = await resolver.createCourse(input, AUTH_CTX);
      // instructorId is overridden from auth context (security: ignore client-supplied value)
      expect(mockCourseService.create).toHaveBeenCalledWith({
        title: 'New',
        instructorId: 'user-1',
        tenantId: 'tenant-1',
        creatorId: 'user-1',
      });
      expect(result).toEqual(MOCK_COURSE);
    });

    it('throws UnauthorizedException when no auth context', async () => {
      await expect(
        resolver.createCourse({ title: 'X' }, NO_AUTH_CTX)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateCourse()', () => {
    it('delegates to service.update with id and input', async () => {
      const updated = { ...MOCK_COURSE, title: 'Updated' };
      mockCourseService.update.mockResolvedValue(updated);
      const input = { title: 'Updated' };
      const result = await resolver.updateCourse('course-1', input, AUTH_CTX);
      expect(mockCourseService.update).toHaveBeenCalledWith('course-1', input);
      expect(result).toEqual(updated);
    });
  });

  describe('publishCourse()', () => {
    it('calls setPublished(id, true) and returns course', async () => {
      const published = { ...MOCK_COURSE, isPublished: true };
      mockCourseService.setPublished.mockResolvedValue(published);
      const result = await resolver.publishCourse('course-1', AUTH_CTX);
      expect(mockCourseService.setPublished).toHaveBeenCalledWith(
        'course-1',
        true
      );
      expect(result).toEqual(published);
    });

    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.publishCourse('course-1', NO_AUTH_CTX)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('unpublishCourse()', () => {
    it('calls setPublished(id, false) and returns course', async () => {
      const unpublished = { ...MOCK_COURSE, isPublished: false };
      mockCourseService.setPublished.mockResolvedValue(unpublished);
      const result = await resolver.unpublishCourse('course-1', AUTH_CTX);
      expect(mockCourseService.setPublished).toHaveBeenCalledWith(
        'course-1',
        false
      );
      expect(result).toEqual(unpublished);
    });

    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.unpublishCourse('course-1', NO_AUTH_CTX)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteCourse()', () => {
    it('calls service.delete and returns true', async () => {
      mockCourseService.delete.mockResolvedValue(true);
      const result = await resolver.deleteCourse('course-1', AUTH_CTX);
      expect(mockCourseService.delete).toHaveBeenCalledWith('course-1');
      expect(result).toBe(true);
    });

    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.deleteCourse('course-1', NO_AUTH_CTX)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── Enrollment ─────────────────────────────────────────────────────────────

  describe('enrollCourse()', () => {
    it('delegates to enrollmentService.enrollCourse', async () => {
      mockEnrollmentService.enrollCourse.mockResolvedValue(MOCK_ENROLLMENT);
      const result = await resolver.enrollCourse('course-1', AUTH_CTX);
      expect(mockEnrollmentService.enrollCourse).toHaveBeenCalledWith(
        'course-1',
        expect.objectContaining({ userId: 'user-1', tenantId: 'tenant-1' })
      );
      expect(result).toEqual(MOCK_ENROLLMENT);
    });

    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.enrollCourse('course-1', NO_AUTH_CTX)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('unenrollCourse()', () => {
    it('delegates to enrollmentService.unenrollCourse', async () => {
      mockEnrollmentService.unenrollCourse.mockResolvedValue(true);
      const result = await resolver.unenrollCourse('course-1', AUTH_CTX);
      expect(mockEnrollmentService.unenrollCourse).toHaveBeenCalledWith(
        'course-1',
        expect.objectContaining({ userId: 'user-1' })
      );
      expect(result).toBe(true);
    });

    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.unenrollCourse('course-1', NO_AUTH_CTX)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMyEnrollments()', () => {
    it('delegates to enrollmentService.getMyEnrollments', async () => {
      mockEnrollmentService.getMyEnrollments.mockResolvedValue([
        MOCK_ENROLLMENT,
      ]);
      const result = await resolver.getMyEnrollments(AUTH_CTX);
      expect(mockEnrollmentService.getMyEnrollments).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' })
      );
      expect(result).toEqual([MOCK_ENROLLMENT]);
    });

    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(resolver.getMyEnrollments(NO_AUTH_CTX)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('returns empty array when no enrollments', async () => {
      mockEnrollmentService.getMyEnrollments.mockResolvedValue([]);
      expect(await resolver.getMyEnrollments(AUTH_CTX)).toEqual([]);
    });
  });

  // ── Progress ───────────────────────────────────────────────────────────────

  describe('getMyCourseProgress()', () => {
    const MOCK_PROGRESS = {
      courseId: 'course-1',
      totalItems: 10,
      completedItems: 5,
      percentComplete: 50,
    };

    it('delegates to enrollmentService.getCourseProgress', async () => {
      mockEnrollmentService.getCourseProgress.mockResolvedValue(MOCK_PROGRESS);
      const result = await resolver.getMyCourseProgress('course-1', AUTH_CTX);
      expect(mockEnrollmentService.getCourseProgress).toHaveBeenCalledWith(
        'course-1',
        expect.objectContaining({ userId: 'user-1' })
      );
      expect(result).toEqual(MOCK_PROGRESS);
    });

    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.getMyCourseProgress('course-1', NO_AUTH_CTX)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('markContentViewed()', () => {
    it('delegates to enrollmentService.markContentViewed', async () => {
      mockEnrollmentService.markContentViewed.mockResolvedValue(true);
      const result = await resolver.markContentViewed('item-1', AUTH_CTX);
      expect(mockEnrollmentService.markContentViewed).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({ userId: 'user-1' })
      );
      expect(result).toBe(true);
    });

    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.markContentViewed('item-1', NO_AUTH_CTX)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
