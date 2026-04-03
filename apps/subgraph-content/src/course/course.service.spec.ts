/* eslint-disable security/detect-object-injection */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseService } from './course.service';
import { CoursePublishService } from './course-publish.service';
import { withReadReplica } from '@edusphere/db';

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
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withReadReplica: vi.fn((fn: (db: typeof mockDb) => unknown) => fn(mockDb)),
  withTenantContext: vi.fn(
    (_db: unknown, _ctx: unknown, fn: (db: typeof mockDb) => unknown) =>
      fn(mockDb)
  ),
  schema: {
    courses: {
      id: 'id',
      tenantId: 'tenant_id',
      title: 'title',
      description: 'description',
      instructorId: 'instructor_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deleted_at: 'deleted_at',
    },
    lessons: {
      id: 'id',
      course_id: 'course_id',
      status: 'status',
      deleted_at: 'deleted_at',
    },
    lesson_pipeline_runs: {
      id: 'id',
      lesson_id: 'lesson_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  desc: vi.fn((col) => ({ col, direction: 'desc' })),
  ilike: vi.fn((col, pattern) => ({ col, pattern, op: 'ilike' })),
  or: vi.fn((...args) => ({ args, op: 'or' })),
  and: vi.fn((...args) => ({ args, op: 'and' })),
  isNull: vi.fn((col) => ({ col, op: 'isNull' })),
  count: vi.fn(() => 'count(*)'),
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
  forkedFromId: null,
};

describe('CourseService', () => {
  let service: CourseService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CourseService(new CoursePublishService());
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
      // findAll chain: select().from().where().orderBy().limit().offset()
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
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

  describe('setPublished()', () => {
    beforeEach(() => {
      mockReturning.mockResolvedValue([MOCK_COURSE]);
      const updateWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      mockSet.mockReturnValue({ where: updateWhere });
      mockUpdate.mockReturnValue({ set: mockSet });
    });

    it('sets is_published to false (unpublish)', async () => {
      let cap: Record<string, unknown> = {};
      mockSet.mockImplementation((v: Record<string, unknown>) => {
        const updateWhere = vi
          .fn()
          .mockReturnValue({ returning: mockReturning });
        cap = v;
        return { where: updateWhere };
      });
      await service.setPublished('course-1', false);
      expect(cap['is_published']).toBe(false);
    });

    it('uses eq() with the provided id (unpublish path)', async () => {
      const { eq } = await import('@edusphere/db');
      await service.setPublished('course-42', false);
      expect(eq).toHaveBeenCalledWith(expect.anything(), 'course-42');
    });

    it('returns mapped course (unpublish path)', async () => {
      const result = await service.setPublished('course-1', false);
      expect(result).toEqual(MOCK_COURSE);
    });
  });

  describe('delete()', () => {
    const tenantCtx = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      userRole: 'INSTRUCTOR' as const,
    };
    // DB returns snake_case; the service reads rawCourse['instructor_id']
    const MOCK_DB_COURSE = { ...MOCK_COURSE, instructor_id: 'user-1' };

    beforeEach(() => {
      // select().from().where() chain for course lookup
      mockWhere.mockResolvedValue([MOCK_DB_COURSE]);
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });
      // update().set().where() chain for soft delete
      const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
      mockSet.mockReturnValue({ where: mockUpdateWhere });
      mockUpdate.mockReturnValue({ set: mockSet });
    });

    it('sets deleted_at to a Date (soft delete)', async () => {
      let cap: Record<string, unknown> = {};
      const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
      mockSet.mockImplementation((v: Record<string, unknown>) => {
        cap = v;
        return { where: mockUpdateWhere };
      });
      await service.delete('course-1', tenantCtx);
      expect(cap['deleted_at']).toBeInstanceOf(Date);
    });

    it('uses eq() with the provided id', async () => {
      const { eq } = await import('@edusphere/db');
      await service.delete('course-99', tenantCtx);
      expect(eq).toHaveBeenCalledWith(expect.anything(), 'course-99');
    });

    it('returns true when course was found and soft-deleted', async () => {
      const result = await service.delete('course-1', tenantCtx);
      expect(result).toBe(true);
    });

    it('throws NotFoundException when course is not found', async () => {
      mockWhere.mockResolvedValue([]);
      await expect(service.delete('nonexistent', tenantCtx)).rejects.toThrow(
        'Course not found'
      );
    });
  });

  describe('search()', () => {
    beforeEach(() => {
      mockLimit.mockResolvedValue([MOCK_COURSE]);
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
      mockSelect.mockReturnValue({ from: mockFrom });
    });

    it('returns courses matching title', async () => {
      mockLimit.mockResolvedValue([MOCK_COURSE]);
      const result = await service.search('Test', 10);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('returns courses matching description', async () => {
      const descMatch = { ...MOCK_COURSE, description: 'Advanced topic' };
      mockLimit.mockResolvedValue([descMatch]);
      const result = await service.search('Advanced', 10);
      expect(result).toHaveLength(1);
    });

    it('returns empty array for query shorter than 2 characters', async () => {
      const result = await service.search('a', 10);
      expect(result).toEqual([]);
      // withReadReplica should NOT be called for short queries
      const { withReadReplica } = await import('@edusphere/db');
      expect(withReadReplica).not.toHaveBeenCalled();
    });

    it('returns empty array for empty string query', async () => {
      const result = await service.search('', 10);
      expect(result).toEqual([]);
    });

    it('logs error and throws BadRequestException on DB failure', async () => {
      mockLimit.mockRejectedValue(new Error('DB connection lost'));
      await expect(service.search('hello', 10)).rejects.toThrow(
        'Failed to search courses. Please try again.'
      );
    });

    it('calls ilike() on title and description columns', async () => {
      const { ilike } = await import('@edusphere/db');
      mockLimit.mockResolvedValue([]);
      await service.search('test query', 10);
      expect(ilike).toHaveBeenCalledTimes(2);
    });

    it('calls or() to combine title and description conditions', async () => {
      const { or } = await import('@edusphere/db');
      mockLimit.mockResolvedValue([]);
      await service.search('test query', 10);
      expect(or).toHaveBeenCalled();
    });

    it('applies the given limit', async () => {
      mockLimit.mockResolvedValue([]);
      await service.search('test', 5);
      expect(mockLimit).toHaveBeenCalledWith(5);
    });
  });

  describe('forkCourse()', () => {
    beforeEach(() => {
      mockReturning.mockResolvedValue([MOCK_COURSE]);
      mockValues.mockReturnValue({ returning: mockReturning });
      mockInsert.mockReturnValue({ values: mockValues });
      // Default findById chain (used by forkCourse internally)
      mockLimit.mockResolvedValue([MOCK_COURSE]);
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
      mockSelect.mockReturnValue({ from: mockFrom });
    });

    it('creates a forked course with forkedFromId', async () => {
      const forkRow = {
        ...MOCK_COURSE,
        id: 'fork-id',
        forked_from_id: 'course-1',
      };
      mockReturning.mockResolvedValue([forkRow]);
      const result = await service.forkCourse('course-1', 'user-1', 'tenant-1');
      expect(result?.forkedFromId).toBe('course-1');
    });

    it('throws NotFoundException when source course not found', async () => {
      mockLimit.mockResolvedValue([]);
      await expect(
        service.forkCourse('bad-id', 'user-1', 'tenant-1')
      ).rejects.toThrow('not found');
    });

    it('sets forked course status to DRAFT (is_published = false)', async () => {
      let insertedValues: Record<string, unknown> = {};
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        insertedValues = v;
        return { returning: mockReturning };
      });
      mockReturning.mockResolvedValue([{ ...MOCK_COURSE, id: 'fork-id' }]);
      await service.forkCourse('course-1', 'user-1', 'tenant-1');
      expect(insertedValues['is_published']).toBe(false);
    });

    it('sets forked_from_id to the original courseId', async () => {
      let insertedValues: Record<string, unknown> = {};
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        insertedValues = v;
        return { returning: mockReturning };
      });
      mockReturning.mockResolvedValue([{ ...MOCK_COURSE, id: 'fork-id' }]);
      await service.forkCourse('course-1', 'user-1', 'tenant-1');
      expect(insertedValues['forked_from_id']).toBe('course-1');
    });

    it('appends (Fork) to the original title', async () => {
      let insertedValues: Record<string, unknown> = {};
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        insertedValues = v;
        return { returning: mockReturning };
      });
      mockReturning.mockResolvedValue([{ ...MOCK_COURSE, id: 'fork-id' }]);
      await service.forkCourse('course-1', 'user-1', 'tenant-1');
      expect(String(insertedValues['title'])).toContain('(Fork)');
    });

    it('assigns the new owner as instructor_id', async () => {
      let insertedValues: Record<string, unknown> = {};
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        insertedValues = v;
        return { returning: mockReturning };
      });
      mockReturning.mockResolvedValue([{ ...MOCK_COURSE, id: 'fork-id' }]);
      await service.forkCourse('course-1', 'user-99', 'tenant-1');
      expect(insertedValues['instructor_id']).toBe('user-99');
    });
  });

  describe('checkCourseReadiness()', () => {
    const READY_COURSE = {
      ...MOCK_COURSE,
      title: 'Complete Course',
      description: 'Has description',
    };

    const READY_LESSON = {
      id: 'lesson-1',
      course_id: 'course-1',
      status: 'READY',
      deleted_at: null,
    };

    function setupReadinessChain(options: {
      course?: unknown;
      lessons?: unknown[];
      pipelineRunCounts?: number[];
    }) {
      const {
        course = READY_COURSE,
        lessons = [READY_LESSON],
        pipelineRunCounts = [1],
      } = options;
      let withReadReplicaCallCount = 0;

      vi.mocked(withReadReplica).mockImplementation(
        (fn: (db: typeof mockDb) => unknown) => {
          withReadReplicaCallCount++;
          if (withReadReplicaCallCount === 1) {
            mockLimit.mockResolvedValue(course ? [course] : []);
            mockWhere.mockReturnValue({ limit: mockLimit });
            mockFrom.mockReturnValue({ where: mockWhere });
            mockSelect.mockReturnValue({ from: mockFrom });
            return fn(mockDb);
          }
          if (withReadReplicaCallCount === 2) {
            mockWhere.mockResolvedValue(lessons);
            mockFrom.mockReturnValue({ where: mockWhere });
            mockSelect.mockReturnValue({ from: mockFrom });
            return fn(mockDb);
          }
          const runIdx = withReadReplicaCallCount - 3;
          const cnt = pipelineRunCounts[runIdx] ?? 0;
          mockLimit.mockResolvedValue([{ cnt }]);
          mockFrom.mockReturnValue({
            where: vi.fn().mockReturnValue({ limit: mockLimit }),
          });
          mockSelect.mockReturnValue({ from: mockFrom });
          return fn(mockDb);
        }
      );
    }

    it('returns ready=true when all checks pass', async () => {
      setupReadinessChain({
        course: READY_COURSE,
        lessons: [READY_LESSON],
        pipelineRunCounts: [1],
      });

      const result = await service.checkCourseReadiness('course-1');

      expect(result.ready).toBe(true);
      expect(result.checks.every((c) => c.passed)).toBe(true);
    });

    it('returns ready=false when course has no description', async () => {
      setupReadinessChain({
        course: { ...READY_COURSE, description: '' },
        lessons: [READY_LESSON],
        pipelineRunCounts: [1],
      });

      const result = await service.checkCourseReadiness('course-1');

      expect(result.ready).toBe(false);
      const descCheck = result.checks.find((c) => c.name === 'has_description');
      expect(descCheck?.passed).toBe(false);
      expect(descCheck?.message).toContain('description');
    });

    it('returns ready=false when no lessons exist', async () => {
      setupReadinessChain({
        course: READY_COURSE,
        lessons: [],
        pipelineRunCounts: [],
      });

      const result = await service.checkCourseReadiness('course-1');

      expect(result.ready).toBe(false);
      const lessonsCheck = result.checks.find((c) => c.name === 'has_lessons');
      expect(lessonsCheck?.passed).toBe(false);
    });

    it('returns ready=false when lessons are not in READY/PUBLISHED status', async () => {
      setupReadinessChain({
        course: READY_COURSE,
        lessons: [{ ...READY_LESSON, status: 'DRAFT' }],
        pipelineRunCounts: [1],
      });

      const result = await service.checkCourseReadiness('course-1');

      expect(result.ready).toBe(false);
      const readyCheck = result.checks.find((c) => c.name === 'lessons_ready');
      expect(readyCheck?.passed).toBe(false);
    });

    it('returns ready=false when no pipeline results exist', async () => {
      setupReadinessChain({
        course: READY_COURSE,
        lessons: [READY_LESSON],
        pipelineRunCounts: [0],
      });

      const result = await service.checkCourseReadiness('course-1');

      expect(result.ready).toBe(false);
      const pipelineCheck = result.checks.find(
        (c) => c.name === 'has_pipeline_results'
      );
      expect(pipelineCheck?.passed).toBe(false);
    });

    it('returns checks list with all 5 check names', async () => {
      setupReadinessChain({});

      const result = await service.checkCourseReadiness('course-1');

      const names = result.checks.map((c) => c.name);
      expect(names).toContain('has_title');
      expect(names).toContain('has_description');
      expect(names).toContain('has_lessons');
      expect(names).toContain('lessons_ready');
      expect(names).toContain('has_pipeline_results');
    });

    it('throws NotFoundException when course not found', async () => {
      setupReadinessChain({ course: null });

      await expect(service.checkCourseReadiness('nonexistent')).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('setPublished() — readiness gate', () => {
    function setupPublishWithReadiness(ready: boolean) {
      let callCount = 0;

      if (ready) {
        vi.mocked(withReadReplica).mockImplementation(
          (fn: (db: typeof mockDb) => unknown) => {
            callCount++;
            if (callCount === 1) {
              mockLimit.mockResolvedValue([
                {
                  ...MOCK_COURSE,
                  title: 'Complete Course',
                  description: 'Has desc',
                },
              ]);
              mockWhere.mockReturnValue({ limit: mockLimit });
              mockFrom.mockReturnValue({ where: mockWhere });
              mockSelect.mockReturnValue({ from: mockFrom });
              return fn(mockDb);
            }
            if (callCount === 2) {
              mockWhere.mockResolvedValue([
                {
                  id: 'lesson-1',
                  course_id: 'course-1',
                  status: 'READY',
                  deleted_at: null,
                },
              ]);
              mockFrom.mockReturnValue({ where: mockWhere });
              mockSelect.mockReturnValue({ from: mockFrom });
              return fn(mockDb);
            }
            mockLimit.mockResolvedValue([{ cnt: 1 }]);
            mockFrom.mockReturnValue({
              where: vi.fn().mockReturnValue({ limit: mockLimit }),
            });
            mockSelect.mockReturnValue({ from: mockFrom });
            return fn(mockDb);
          }
        );
      } else {
        vi.mocked(withReadReplica).mockImplementation(
          (fn: (db: typeof mockDb) => unknown) => {
            callCount++;
            if (callCount === 1) {
              mockLimit.mockResolvedValue([
                {
                  ...MOCK_COURSE,
                  title: 'No Desc',
                  description: '',
                },
              ]);
              mockWhere.mockReturnValue({ limit: mockLimit });
              mockFrom.mockReturnValue({ where: mockWhere });
              mockSelect.mockReturnValue({ from: mockFrom });
              return fn(mockDb);
            }
            if (callCount === 2) {
              mockWhere.mockResolvedValue([]);
              mockFrom.mockReturnValue({ where: mockWhere });
              mockSelect.mockReturnValue({ from: mockFrom });
              return fn(mockDb);
            }
            return fn(mockDb);
          }
        );
      }

      // Setup update chain for when publish succeeds
      mockReturning.mockResolvedValue([MOCK_COURSE]);
      const updateWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      mockSet.mockReturnValue({ where: updateWhere });
      mockUpdate.mockReturnValue({ set: mockSet });
    }

    it('throws BadRequestException when course is not ready', async () => {
      setupPublishWithReadiness(false);

      await expect(service.setPublished('course-1', true)).rejects.toThrow(
        'Course is not ready to publish'
      );
    });

    it('succeeds when course is ready', async () => {
      setupPublishWithReadiness(true);

      const result = await service.setPublished('course-1', true);

      expect(result).toBeDefined();
    });

    it('skips readiness check when unpublishing', async () => {
      // Unpublish should NOT call checkCourseReadiness
      mockReturning.mockResolvedValue([MOCK_COURSE]);
      const updateWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      mockSet.mockReturnValue({ where: updateWhere });
      mockUpdate.mockReturnValue({ set: mockSet });

      const result = await service.setPublished('course-1', false);

      expect(result).toBeDefined();
    });
  });
});
