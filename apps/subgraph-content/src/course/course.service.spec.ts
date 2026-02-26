import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseService } from './course.service';

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockOffset = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();

const mockDb = { select: mockSelect, insert: mockInsert, update: mockUpdate };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    courses: {
      id: 'id',
      tenantId: 'tenant_id',
      title: 'title',
      description: 'description',
      instructorId: 'instructor_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  desc: vi.fn((col) => ({ col, direction: 'desc' })),
}));

const MOCK_COURSE = {
  id: 'course-1',
  tenantId: 'tenant-1',
  title: 'Test Course',
  description: 'A test course',
  instructorId: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  isPublished: false,
  slug: '',
  thumbnailUrl: null,
  estimatedHours: null,
};

describe('CourseService', () => {
  let service: CourseService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CourseService();
  });

  describe('findById()', () => {
    beforeEach(() => {
      mockLimit.mockResolvedValue([MOCK_COURSE]);
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
      mockSelect.mockReturnValue({ from: mockFrom });
    });

    it('returns course when found', async () => {
      mockLimit.mockResolvedValue([MOCK_COURSE]);
      const result = await service.findById('course-1');
      expect(result).toEqual(MOCK_COURSE);
    });

    it('returns null when course not found', async () => {
      mockLimit.mockResolvedValue([]);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('uses eq() with the provided id', async () => {
      const { eq } = await import('@edusphere/db');
      mockLimit.mockResolvedValue([MOCK_COURSE]);
      await service.findById('course-42');
      expect(eq).toHaveBeenCalledWith(expect.anything(), 'course-42');
    });

    it('applies limit(1)', async () => {
      await service.findById('course-1');
      expect(mockLimit).toHaveBeenCalledWith(1);
    });

    it('calls from(schema.courses)', async () => {
      await service.findById('course-1');
      expect(mockFrom).toHaveBeenCalled();
    });
  });

  describe('findAll()', () => {
    beforeEach(() => {
      mockOffset.mockResolvedValue([MOCK_COURSE]);
      mockLimit.mockReturnValue({ offset: mockOffset });
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
      mockSelect.mockReturnValue({ from: mockFrom });
    });

    it('returns array of courses', async () => {
      const result = await service.findAll(10, 0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('applies the given limit', async () => {
      await service.findAll(25, 0);
      expect(mockLimit).toHaveBeenCalledWith(25);
    });

    it('applies the given offset', async () => {
      await service.findAll(10, 50);
      expect(mockOffset).toHaveBeenCalledWith(50);
    });

    it('uses desc ordering', async () => {
      const { desc } = await import('@edusphere/db');
      await service.findAll(10, 0);
      expect(desc).toHaveBeenCalled();
      expect(mockOrderBy).toHaveBeenCalled();
    });

    it('returns multiple courses', async () => {
      const courses = [MOCK_COURSE, { ...MOCK_COURSE, id: 'course-2' }];
      mockOffset.mockResolvedValue(courses);
      const result = await service.findAll(10, 0);
      expect(result).toHaveLength(2);
    });
  });

  describe('create()', () => {
    beforeEach(() => {
      mockReturning.mockResolvedValue([MOCK_COURSE]);
      mockValues.mockReturnValue({ returning: mockReturning });
      mockInsert.mockReturnValue({ values: mockValues });
    });

    it('inserts and returns the new course', async () => {
      const input = {
        tenantId: 'tenant-1',
        title: 'New Course',
        description: 'Desc',
        instructorId: 'user-1',
      };
      const result = await service.create(input);
      expect(result).toEqual(MOCK_COURSE);
    });

    it('maps tenantId correctly', async () => {
      let cap: Record<string, unknown> = {};
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        cap = v;
        return { returning: mockReturning };
      });
      await service.create({
        tenantId: 'tenant-99',
        title: 'T',
        description: 'D',
        instructorId: 'u',
      });
      expect(cap['tenant_id']).toBe('tenant-99');
    });

    it('maps title correctly', async () => {
      let cap: Record<string, unknown> = {};
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        cap = v;
        return { returning: mockReturning };
      });
      await service.create({
        tenantId: 'tenant-1',
        title: 'My Course',
        description: 'D',
        instructorId: 'u',
      });
      expect(cap['title']).toBe('My Course');
    });

    it('maps description correctly', async () => {
      let cap: Record<string, unknown> = {};
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        cap = v;
        return { returning: mockReturning };
      });
      await service.create({
        tenantId: 't',
        title: 'T',
        description: 'My Desc',
        instructorId: 'u',
      });
      expect(cap['description']).toBe('My Desc');
    });

    it('maps instructorId correctly', async () => {
      let cap: Record<string, unknown> = {};
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        cap = v;
        return { returning: mockReturning };
      });
      await service.create({
        tenantId: 't',
        title: 'T',
        description: 'D',
        instructorId: 'user-42',
      });
      expect(cap['instructor_id']).toBe('user-42');
    });

    it('calls .returning()', async () => {
      await service.create({
        tenantId: 't',
        title: 'T',
        description: 'D',
        instructorId: 'u',
      });
      expect(mockReturning).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      mockReturning.mockResolvedValue([MOCK_COURSE]);
      mockWhere.mockReturnValue({ returning: mockReturning });
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });
    });

    it('returns the updated course', async () => {
      const updated = { ...MOCK_COURSE, title: 'Updated' };
      mockReturning.mockResolvedValue([updated]);
      const result = await service.update('course-1', {
        title: 'Updated',
        description: 'D',
      });
      expect(result).toEqual(updated);
    });

    it('updates the title field', async () => {
      let cap: Record<string, unknown> = {};
      mockSet.mockImplementation((v: Record<string, unknown>) => {
        cap = v;
        return { where: mockWhere };
      });
      await service.update('course-1', {
        title: 'New Title',
        description: 'D',
      });
      expect(cap['title']).toBe('New Title');
    });

    it('updates the description field', async () => {
      let cap: Record<string, unknown> = {};
      mockSet.mockImplementation((v: Record<string, unknown>) => {
        cap = v;
        return { where: mockWhere };
      });
      await service.update('course-1', { title: 'T', description: 'New Desc' });
      expect(cap['description']).toBe('New Desc');
    });

    it('sets updatedAt to a Date object', async () => {
      let cap: Record<string, unknown> = {};
      mockSet.mockImplementation((v: Record<string, unknown>) => {
        cap = v;
        return { where: mockWhere };
      });
      await service.update('course-1', { title: 'T', description: 'D' });
      expect(cap['updatedAt']).toBeInstanceOf(Date);
    });

    it('uses eq() with the provided id', async () => {
      const { eq } = await import('@edusphere/db');
      await service.update('course-99', { title: 'T', description: 'D' });
      expect(eq).toHaveBeenCalledWith(expect.anything(), 'course-99');
    });

    it('calls .returning()', async () => {
      await service.update('course-1', { title: 'T', description: 'D' });
      expect(mockReturning).toHaveBeenCalled();
    });
  });
});
