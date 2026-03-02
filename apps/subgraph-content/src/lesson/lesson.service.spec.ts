import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { LessonService } from './lesson.service';

// ─── DB chain mocks ───────────────────────────────────────────────────────────

const mockReturning = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const _mockOffset = vi.fn();
const _mockOrderBy = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockValues = vi.fn();
const mockInsert = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn(),
  schema: {
    lessons: {
      id: 'id',
      tenant_id: 'tenant_id',
      course_id: 'course_id',
      module_id: 'module_id',
      title: 'title',
      type: 'type',
      status: 'status',
      instructor_id: 'instructor_id',
      created_at: 'created_at',
      deleted_at: 'deleted_at',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col) => ({ col, direction: 'desc' })),
  isNull: vi.fn((col) => ({ col, op: 'isNull' })),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({ encode: vi.fn((s: string) => s) })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
  NatsSubjects: {
    LESSON_CREATED: 'EDUSPHERE.lesson.created',
    LESSON_PUBLISHED: 'EDUSPHERE.lesson.published',
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_CTX = { tenantId: 't-1', userId: 'u-1', userRole: 'INSTRUCTOR' };

const MOCK_ROW = {
  id: 'l-1',
  course_id: 'c-1',
  module_id: null,
  title: 'Introduction',
  type: 'THEMATIC',
  series: null,
  lesson_date: null,
  instructor_id: 'u-1',
  status: 'DRAFT',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LessonService', () => {
  let service: LessonService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LessonService();
  });

  describe('findById()', () => {
    beforeEach(() => {
      mockLimit.mockResolvedValue([MOCK_ROW]);
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });
    });

    it('returns mapped lesson when found', async () => {
      const result = await service.findById('l-1', TENANT_CTX);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('l-1');
    });

    it('returns null when lesson does not exist', async () => {
      mockLimit.mockResolvedValue([]);
      const result = await service.findById('no-such-id', TENANT_CTX);
      expect(result).toBeNull();
    });

    it('maps status from row', async () => {
      const result = await service.findById('l-1', TENANT_CTX);
      expect(result?.status).toBe('DRAFT');
    });
  });

  describe('create()', () => {
    beforeEach(() => {
      mockReturning.mockResolvedValue([MOCK_ROW]);
      mockValues.mockReturnValue({ returning: mockReturning });
      mockInsert.mockReturnValue({ values: mockValues });
    });

    it('returns the newly created lesson', async () => {
      const input = {
        courseId: 'c-1',
        title: 'Introduction',
        type: 'THEMATIC' as const,
        instructorId: 'u-1',
      };
      const result = await service.create(input, TENANT_CTX);
      expect(result?.title).toBe('Introduction');
    });

    it('inserts with DRAFT status', async () => {
      let captured: Record<string, unknown> = {};
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        captured = v;
        return { returning: mockReturning };
      });
      await service.create(
        { courseId: 'c-1', title: 'T', type: 'THEMATIC', instructorId: 'u-1' },
        TENANT_CTX
      );
      expect(captured['status']).toBe('DRAFT');
    });

    it('calls returning() after insert', async () => {
      await service.create(
        { courseId: 'c-1', title: 'T', type: 'THEMATIC', instructorId: 'u-1' },
        TENANT_CTX
      );
      expect(mockReturning).toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    beforeEach(() => {
      mockWhere.mockResolvedValue([]);
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });
    });

    it('returns true after soft-delete', async () => {
      const result = await service.delete('l-1', TENANT_CTX);
      expect(result).toBe(true);
    });

    it('sets deleted_at via update', async () => {
      let captured: Record<string, unknown> = {};
      mockSet.mockImplementation((v: Record<string, unknown>) => {
        captured = v;
        return { where: mockWhere };
      });
      await service.delete('l-1', TENANT_CTX);
      expect(captured['deleted_at']).toBeInstanceOf(Date);
    });
  });

  describe('publish()', () => {
    beforeEach(() => {
      // findById chain
      mockLimit.mockResolvedValue([MOCK_ROW]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });
      // update chain
      const publishedRow = { ...MOCK_ROW, status: 'PUBLISHED' };
      mockReturning.mockResolvedValue([publishedRow]);
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });
    });

    it('throws NotFoundException when lesson not found', async () => {
      mockLimit.mockResolvedValue([]);
      await expect(service.publish('no-id', TENANT_CTX)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
