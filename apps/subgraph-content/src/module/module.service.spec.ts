import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

const mocks = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();
  const mockLimit = vi.fn();
  const mockOrderBy = vi.fn();
  const mockInsert = vi.fn();
  const mockValues = vi.fn();
  const mockReturning = vi.fn();
  const mockUpdate = vi.fn();
  const mockSet = vi.fn();
  const mockDelete = vi.fn();

  const mockDb = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  };

  return {
    mockSelect, mockFrom, mockWhere, mockLimit, mockOrderBy,
    mockInsert, mockValues, mockReturning, mockUpdate, mockSet, mockDelete,
    mockDb,
  };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mocks.mockDb),
  schema: {
    modules: { id: 'id', course_id: 'course_id', order_index: 'order_index' },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  asc: vi.fn((col) => ({ col, dir: 'asc' })),
  inArray: vi.fn((col, vals) => ({ col, vals })),
}));

import { ModuleService } from './module.service';

const DB_MODULE = {
  id: 'mod-1',
  course_id: 'course-1',
  title: 'Introduction',
  description: null,
  order_index: 0,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  deleted_at: null,
};

const MAPPED_MODULE = {
  ...DB_MODULE,
  courseId: 'course-1',
  orderIndex: 0,
  createdAt: DB_MODULE.created_at,
  updatedAt: DB_MODULE.updated_at,
};

describe('ModuleService', () => {
  let service: ModuleService;

  beforeEach(() => {
    Object.values(mocks).forEach((m) => {
      if (typeof (m as { mockReset?: () => void }).mockReset === 'function') {
        (m as { mockReset: () => void }).mockReset();
      }
    });
    service = new ModuleService();
  });

  describe('findById()', () => {
    beforeEach(() => {
      mocks.mockLimit.mockResolvedValue([DB_MODULE]);
      mocks.mockWhere.mockReturnValue({ limit: mocks.mockLimit });
      mocks.mockFrom.mockReturnValue({ where: mocks.mockWhere });
      mocks.mockSelect.mockReturnValue({ from: mocks.mockFrom });
    });

    it('returns mapped module when found', async () => {
      const result = await service.findById('mod-1');
      expect(result).toMatchObject({ id: 'mod-1', courseId: 'course-1', orderIndex: 0 });
    });

    it('throws NotFoundException when module not found', async () => {
      mocks.mockLimit.mockResolvedValue([]);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCourse()', () => {
    beforeEach(() => {
      mocks.mockOrderBy.mockResolvedValue([DB_MODULE]);
      mocks.mockWhere.mockReturnValue({ orderBy: mocks.mockOrderBy });
      mocks.mockFrom.mockReturnValue({ where: mocks.mockWhere });
      mocks.mockSelect.mockReturnValue({ from: mocks.mockFrom });
    });

    it('returns mapped modules for a course', async () => {
      const result = await service.findByCourse('course-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ courseId: 'course-1', orderIndex: 0 });
    });

    it('calls orderBy for ascending order_index', async () => {
      await service.findByCourse('course-1');
      expect(mocks.mockOrderBy).toHaveBeenCalled();
    });

    it('returns empty array when no modules for course', async () => {
      mocks.mockOrderBy.mockResolvedValue([]);
      const result = await service.findByCourse('course-empty');
      expect(result).toEqual([]);
    });
  });

  describe('create()', () => {
    beforeEach(() => {
      mocks.mockReturning.mockResolvedValue([DB_MODULE]);
      mocks.mockValues.mockReturnValue({ returning: mocks.mockReturning });
      mocks.mockInsert.mockReturnValue({ values: mocks.mockValues });
    });

    it('inserts with snake_case keys and returns mapped module', async () => {
      const input = { courseId: 'course-1', title: 'New Module', orderIndex: 0 };
      const result = await service.create(input);
      expect(result).toMatchObject({ courseId: 'course-1', orderIndex: 0 });
      const insertedValues = mocks.mockValues.mock.calls[0]![0];
      expect(insertedValues).toHaveProperty('course_id', 'course-1');
      expect(insertedValues).toHaveProperty('order_index', 0);
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      mocks.mockReturning.mockResolvedValue([DB_MODULE]);
      mocks.mockWhere.mockReturnValue({ returning: mocks.mockReturning });
      mocks.mockSet.mockReturnValue({ where: mocks.mockWhere });
      mocks.mockUpdate.mockReturnValue({ set: mocks.mockSet });
    });

    it('returns mapped updated module', async () => {
      const result = await service.update('mod-1', { title: 'Updated' });
      expect(result).toMatchObject({ id: 'mod-1', courseId: 'course-1' });
    });

    it('maps orderIndex to order_index in update payload', async () => {
      await service.update('mod-1', { orderIndex: 5 });
      const setPayload = mocks.mockSet.mock.calls[0]![0];
      expect(setPayload).toHaveProperty('order_index', 5);
    });

    it('always includes updated_at in the update payload', async () => {
      await service.update('mod-1', { title: 'x' });
      const setPayload = mocks.mockSet.mock.calls[0]![0];
      expect(setPayload).toHaveProperty('updated_at');
    });

    it('throws NotFoundException when module not found for update', async () => {
      mocks.mockReturning.mockResolvedValue([]);
      await expect(service.update('nonexistent', { title: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete()', () => {
    beforeEach(() => {
      mocks.mockWhere.mockResolvedValue({ rowCount: 1 });
      mocks.mockDelete.mockReturnValue({ where: mocks.mockWhere });
    });

    it('returns true when module was deleted', async () => {
      const result = await service.delete('mod-1');
      expect(result).toBe(true);
    });

    it('returns false when module was not found', async () => {
      mocks.mockWhere.mockResolvedValue({ rowCount: 0 });
      const result = await service.delete('nonexistent');
      expect(result).toBe(false);
    });

    it('handles null rowCount gracefully', async () => {
      mocks.mockWhere.mockResolvedValue({ rowCount: null });
      const result = await service.delete('mod-1');
      expect(result).toBe(false);
    });
  });

  describe('reorder()', () => {
    it('issues one db.update call per module id', async () => {
      mocks.mockWhere.mockResolvedValue(undefined);
      mocks.mockSet.mockReturnValue({ where: mocks.mockWhere });
      mocks.mockUpdate.mockReturnValue({ set: mocks.mockSet });

      const orderByMock = vi.fn().mockResolvedValue([DB_MODULE]);
      const innerWhere = vi.fn().mockReturnValue({ orderBy: orderByMock });
      mocks.mockFrom.mockReturnValue({ where: innerWhere });
      mocks.mockSelect.mockReturnValue({ from: mocks.mockFrom });

      await service.reorder('course-1', ['mod-1', 'mod-2', 'mod-3']);
      expect(mocks.mockUpdate).toHaveBeenCalledTimes(3);
    });

    it('returns mapped module list after reorder', async () => {
      mocks.mockWhere.mockResolvedValue(undefined);
      mocks.mockSet.mockReturnValue({ where: mocks.mockWhere });
      mocks.mockUpdate.mockReturnValue({ set: mocks.mockSet });

      const orderByMock = vi.fn().mockResolvedValue([DB_MODULE]);
      const innerWhere = vi.fn().mockReturnValue({ orderBy: orderByMock });
      mocks.mockFrom.mockReturnValue({ where: innerWhere });
      mocks.mockSelect.mockReturnValue({ from: mocks.mockFrom });

      const result = await service.reorder('course-1', ['mod-1']);
      expect(result[0]).toMatchObject({ courseId: 'course-1', orderIndex: 0 });
    });
  });
});
