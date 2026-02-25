import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  schema: {
    modules: { id: 'id', course_id: 'course_id', order_index: 'order_index' },
  },
}));

import { ModuleResolver } from './module.resolver';

const MOCK_MODULE = {
  id: 'mod-1',
  courseId: 'course-1',
  title: 'Introduction',
  orderIndex: 0,
};

describe('ModuleResolver', () => {
  let resolver: ModuleResolver;
  let moduleService: {
    findById: ReturnType<typeof vi.fn>;
    findByCourse: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    reorder: ReturnType<typeof vi.fn>;
  };

  const contentItemLoader = {
    byModuleId: { load: vi.fn().mockResolvedValue([]) },
  };

  beforeEach(() => {
    moduleService = {
      findById: vi.fn(),
      findByCourse: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      reorder: vi.fn(),
    };
    resolver = new ModuleResolver(moduleService as never, contentItemLoader as never);
  });

  describe('getModule()', () => {
    it('returns module by id', async () => {
      moduleService.findById.mockResolvedValue(MOCK_MODULE);
      const result = await resolver.getModule('mod-1');
      expect(result).toEqual(MOCK_MODULE);
      expect(moduleService.findById).toHaveBeenCalledWith('mod-1');
    });

    it('propagates NotFoundException from service', async () => {
      moduleService.findById.mockRejectedValue(new NotFoundException('Module not found'));
      await expect(resolver.getModule('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getModulesByCourse()', () => {
    it('returns modules for given courseId', async () => {
      moduleService.findByCourse.mockResolvedValue([MOCK_MODULE]);
      const result = await resolver.getModulesByCourse('course-1');
      expect(result).toEqual([MOCK_MODULE]);
      expect(moduleService.findByCourse).toHaveBeenCalledWith('course-1');
    });

    it('returns empty array when no modules for course', async () => {
      moduleService.findByCourse.mockResolvedValue([]);
      const result = await resolver.getModulesByCourse('course-empty');
      expect(result).toEqual([]);
    });
  });

  describe('createModule()', () => {
    it('creates and returns new module', async () => {
      const input = { courseId: 'course-1', title: 'New Module', orderIndex: 1 };
      moduleService.create.mockResolvedValue({ ...MOCK_MODULE, ...input });
      const result = await resolver.createModule(input);
      expect(result).toMatchObject(input);
      expect(moduleService.create).toHaveBeenCalledWith(input);
    });
  });

  describe('updateModule()', () => {
    it('updates and returns module', async () => {
      const input = { title: 'Updated Title' };
      moduleService.update.mockResolvedValue({ ...MOCK_MODULE, ...input });
      const result = await resolver.updateModule('mod-1', input);
      expect(result).toMatchObject(input);
      expect(moduleService.update).toHaveBeenCalledWith('mod-1', input);
    });

    it('propagates NotFoundException from service', async () => {
      moduleService.update.mockRejectedValue(new NotFoundException());
      await expect(resolver.updateModule('bad-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteModule()', () => {
    it('returns true when module deleted successfully', async () => {
      moduleService.delete.mockResolvedValue(true);
      const result = await resolver.deleteModule('mod-1');
      expect(result).toBe(true);
      expect(moduleService.delete).toHaveBeenCalledWith('mod-1');
    });

    it('returns false when module not found', async () => {
      moduleService.delete.mockResolvedValue(false);
      const result = await resolver.deleteModule('bad-id');
      expect(result).toBe(false);
    });
  });

  describe('reorderModules()', () => {
    it('returns reordered module list', async () => {
      moduleService.reorder.mockResolvedValue([MOCK_MODULE]);
      const result = await resolver.reorderModules('course-1', ['mod-1']);
      expect(result).toEqual([MOCK_MODULE]);
      expect(moduleService.reorder).toHaveBeenCalledWith('course-1', ['mod-1']);
    });

    it('passes courseId and moduleIds to service', async () => {
      moduleService.reorder.mockResolvedValue([]);
      await resolver.reorderModules('c-1', ['m-2', 'm-1', 'm-3']);
      expect(moduleService.reorder).toHaveBeenCalledWith('c-1', ['m-2', 'm-1', 'm-3']);
    });
  });

  describe('getContentItems() (ResolveField)', () => {
    it('delegates to contentItemLoader.byModuleId.load', async () => {
      contentItemLoader.byModuleId.load.mockResolvedValue([]);
      const result = await resolver.getContentItems(MOCK_MODULE as never, {} as never);
      expect(contentItemLoader.byModuleId.load).toHaveBeenCalledWith('mod-1');
      expect(result).toEqual([]);
    });
  });

  describe('resolveReference()', () => {
    it('resolves module by id from federation reference', async () => {
      moduleService.findById.mockResolvedValue(MOCK_MODULE);
      const result = await resolver.resolveReference({ __typename: 'Module', id: 'mod-1' });
      expect(result).toEqual(MOCK_MODULE);
      expect(moduleService.findById).toHaveBeenCalledWith('mod-1');
    });
  });
});
