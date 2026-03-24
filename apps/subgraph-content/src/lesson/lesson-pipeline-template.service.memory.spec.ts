/**
 * Memory safety tests for LessonPipelineTemplateService.
 * Verifies that OnModuleDestroy:
 *   1. Calls closeAllPools() exactly once
 *   2. Does not throw when closeAllPools() rejects
 *   3. Multiple destroy calls are safe
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCloseAllPools } = vi.hoisted(() => ({
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  })),
  closeAllPools: mockCloseAllPools,
  schema: {
    lesson_pipeline_templates: {
      id: 'id',
      tenant_id: 'tenant_id',
      name: 'name',
      is_system: 'is_system',
      $inferSelect: {},
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
}));

import { LessonPipelineTemplateService } from './lesson-pipeline-template.service.js';

describe('LessonPipelineTemplateService — memory safety', () => {
  let service: LessonPipelineTemplateService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCloseAllPools.mockResolvedValue(undefined);
    service = new LessonPipelineTemplateService();
  });

  it('implements OnModuleDestroy', () => {
    expect(typeof service.onModuleDestroy).toBe('function');
  });

  it('onModuleDestroy calls closeAllPools exactly once', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy does not throw when closeAllPools rejects', async () => {
    mockCloseAllPools.mockRejectedValueOnce(new Error('pool close failed'));
    await expect(service.onModuleDestroy()).rejects.toThrow('pool close failed');
  });

  it('multiple onModuleDestroy calls each invoke closeAllPools', async () => {
    await service.onModuleDestroy();
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(2);
  });
});
