import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock references — declared before vi.mock factories run
// ---------------------------------------------------------------------------

const {
  mockCloseAllPools,
  mockDrain,
  mockPublish,
  mockNatsConnect,
  mockReturning,
  mockLimit,
  mockWhere,
  mockValues,
  mockInsert,
  mockFrom,
  mockSelect,
} = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockLimit = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning, limit: mockLimit });
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  const mockDrain = vi.fn().mockResolvedValue(undefined);
  const mockPublish = vi.fn();
  const mockNatsConnect = vi.fn().mockResolvedValue({ drain: mockDrain, publish: mockPublish });
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

  return {
    mockCloseAllPools,
    mockDrain,
    mockPublish,
    mockNatsConnect,
    mockReturning,
    mockLimit,
    mockWhere,
    mockValues,
    mockInsert,
    mockFrom,
    mockSelect,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
  })),
  closeAllPools: mockCloseAllPools,
  schema: {
    lesson_assets: { lesson_id: 'lesson_id', id: 'id' },
    lessons: { id: 'id', course_id: 'course_id' },
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  withTenantContext: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: mockNatsConnect,
  StringCodec: vi.fn(() => ({ encode: (s: string) => s })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
  NatsSubjects: {
    LESSON_ASSET_UPLOADED: 'EDUSPHERE.lesson.asset.uploaded',
  },
}));

import { LessonAssetService } from './lesson-asset.service.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LessonAssetService', () => {
  let service: LessonAssetService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNatsConnect.mockResolvedValue({ drain: mockDrain, publish: mockPublish });
    mockDrain.mockResolvedValue(undefined);
    mockCloseAllPools.mockResolvedValue(undefined);
    // Re-wire the chainable DB mock after clearAllMocks
    mockReturning.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
    mockWhere.mockReturnValue({ returning: mockReturning, limit: mockLimit });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    service = new LessonAssetService();
  });

  // ── Memory safety — onModuleDestroy ───────────────────────────────────────

  it('onModuleDestroy — calls closeAllPools even when nc is null (never connected)', async () => {
    await service.onModuleDestroy();

    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
    expect(mockDrain).not.toHaveBeenCalled();
  });

  it('onModuleDestroy — drains NATS connection before closing pools', async () => {
    // Force NATS connection via findByLesson (triggers getNats lazily via addAsset publish)
    mockReturning.mockResolvedValueOnce([]);
    mockLimit.mockResolvedValueOnce([]);
    // Trigger getNats by calling addAsset (which calls publishEvent → getNats)
    await service.addAsset(
      'lesson-1',
      { assetType: 'VIDEO' },
      { tenantId: 't1', userId: 'u1', userRole: 'STUDENT' }
    );

    // Now destroy — nc should be set
    await service.onModuleDestroy();

    expect(mockDrain).toHaveBeenCalledTimes(1);
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy — sets nc to null after drain (idempotent — safe to call twice)', async () => {
    mockReturning.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
    await service.addAsset(
      'lesson-2',
      { assetType: 'NOTES' },
      { tenantId: 't1', userId: 'u1', userRole: 'STUDENT' }
    );

    await service.onModuleDestroy();
    // Second call: nc is already null — drain should NOT be called again
    await service.onModuleDestroy();

    expect(mockDrain).toHaveBeenCalledTimes(1);
    expect(mockCloseAllPools).toHaveBeenCalledTimes(2);
  });

  it('onModuleDestroy — does not throw if drain rejects', async () => {
    mockReturning.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
    await service.addAsset(
      'lesson-3',
      { assetType: 'AUDIO' },
      { tenantId: 't1', userId: 'u1', userRole: 'STUDENT' }
    );
    mockDrain.mockRejectedValueOnce(new Error('drain failed'));

    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  // ── findByLesson ──────────────────────────────────────────────────────────

  it('findByLesson — queries DB and maps rows', async () => {
    mockWhere.mockResolvedValueOnce([
      {
        id: 'asset-1',
        lesson_id: 'lesson-1',
        asset_type: 'VIDEO',
        source_url: 'https://example.com/v.mp4',
        file_url: null,
        media_asset_id: null,
        metadata: {},
      },
    ]);

    const result = await service.findByLesson('lesson-1');

    expect(mockSelect).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]?.assetType).toBe('VIDEO');
    expect(result[0]?.sourceUrl).toBe('https://example.com/v.mp4');
  });

  it('findByLesson — returns empty array when no assets found', async () => {
    mockWhere.mockResolvedValueOnce([]);

    const result = await service.findByLesson('lesson-empty');

    expect(result).toEqual([]);
  });

  // ── addAsset ──────────────────────────────────────────────────────────────

  it('addAsset — inserts asset row and returns mapped result', async () => {
    const insertedRow = {
      id: 'asset-new',
      lesson_id: 'lesson-1',
      asset_type: 'AUDIO',
      source_url: null,
      file_url: 'https://minio/audio.mp3',
      media_asset_id: null,
      metadata: {},
    };
    mockReturning.mockResolvedValueOnce([insertedRow]);
    mockLimit.mockResolvedValueOnce([{ course_id: 'course-abc' }]);

    const tenantCtx = { tenantId: 'tenant-1', userId: 'user-1', userRole: 'STUDENT' as const };

    const result = await service.addAsset(
      'lesson-1',
      { assetType: 'AUDIO', fileUrl: 'https://minio/audio.mp3' },
      tenantCtx
    );

    expect(mockInsert).toHaveBeenCalled();
    expect(result?.id).toBe('asset-new');
    expect(result?.assetType).toBe('AUDIO');
  });

  it('addAsset — returns null when insert returns no row', async () => {
    mockReturning.mockResolvedValueOnce([]);
    mockLimit.mockResolvedValueOnce([]);

    const tenantCtx = { tenantId: 'tenant-1', userId: 'user-1', userRole: 'STUDENT' as const };

    const result = await service.addAsset(
      'lesson-x',
      { assetType: 'NOTES' },
      tenantCtx
    );

    expect(result).toBeNull();
  });
});
