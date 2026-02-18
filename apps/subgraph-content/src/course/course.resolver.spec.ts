import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseResolver } from './course.resolver';

const mockCourseService = {
  findById: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
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

describe('CourseResolver', () => {
  let resolver: CourseResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new CourseResolver(mockCourseService as any);
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
      const result = await resolver.getCourse('nonexistent');
      expect(result).toBeNull();
    });

    it('passes the exact id to the service', async () => {
      mockCourseService.findById.mockResolvedValue(MOCK_COURSE);
      await resolver.getCourse('abc-123');
      expect(mockCourseService.findById).toHaveBeenCalledWith('abc-123');
    });
  });
  describe('getCourses()', () => {
    it('delegates to service.findAll with limit and offset', async () => {
      mockCourseService.findAll.mockResolvedValue([MOCK_COURSE]);
      const result = await resolver.getCourses(10, 0);
      expect(mockCourseService.findAll).toHaveBeenCalledWith(10, 0);
      expect(result).toEqual([MOCK_COURSE]);
    });

    it('passes correct pagination params', async () => {
      mockCourseService.findAll.mockResolvedValue([]);
      await resolver.getCourses(25, 50);
      expect(mockCourseService.findAll).toHaveBeenCalledWith(25, 50);
    });

    it('returns empty array when no courses found', async () => {
      mockCourseService.findAll.mockResolvedValue([]);
      const result = await resolver.getCourses(10, 0);
      expect(result).toEqual([]);
    });
  });

  describe('createCourse()', () => {
    it('delegates to service.create with the input', async () => {
      mockCourseService.create.mockResolvedValue(MOCK_COURSE);
      const input = { tenantId: 'tenant-1', title: 'New', description: 'Desc', creatorId: 'u-1' };
      const result = await resolver.createCourse(input);
      expect(mockCourseService.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(MOCK_COURSE);
    });

    it('returns the created course', async () => {
      mockCourseService.create.mockResolvedValue(MOCK_COURSE);
      const result = await resolver.createCourse({ title: 'T' });
      expect(result).toEqual(MOCK_COURSE);
    });
  });

  describe('updateCourse()', () => {
    it('delegates to service.update with id and input', async () => {
      const updated = { ...MOCK_COURSE, title: 'Updated' };
      mockCourseService.update.mockResolvedValue(updated);
      const input = { title: 'Updated', description: 'D' };
      const result = await resolver.updateCourse('course-1', input);
      expect(mockCourseService.update).toHaveBeenCalledWith('course-1', input);
      expect(result).toEqual(updated);
    });

    it('passes the exact id to service.update', async () => {
      mockCourseService.update.mockResolvedValue(MOCK_COURSE);
      await resolver.updateCourse('course-99', { title: 'T' });
      expect(mockCourseService.update).toHaveBeenCalledWith('course-99', expect.any(Object));
    });

    it('returns the updated course', async () => {
      const updated = { ...MOCK_COURSE, title: 'New Title' };
      mockCourseService.update.mockResolvedValue(updated);
      const result = await resolver.updateCourse('course-1', { title: 'New Title' });
      expect(result).toEqual(updated);
    });
  });
});
