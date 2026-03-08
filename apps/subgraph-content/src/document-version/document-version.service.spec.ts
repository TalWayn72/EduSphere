import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  // withTenantContext is overridden per-test via mockResolvedValueOnce
  withTenantContext: vi.fn(),
  schema: {
    documentVersions: {
      id: 'id',
      media_asset_id: 'media_asset_id',
      version_number: 'version_number',
    },
    visualAnchors: {
      id: 'id',
      media_asset_id: 'media_asset_id',
      deleted_at: 'deleted_at',
      is_broken: 'is_broken',
    },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
  isNull: vi.fn((a) => ({ isNull: a })),
  desc: vi.fn((a) => ({ desc: a })),
}));

import { DocumentVersionService } from './document-version.service';

const TENANT_CTX = { tenantId: 'tenant-1', userId: 'user-1', userRole: 'INSTRUCTOR' as const };

const MOCK_ANCHOR = {
  id: 'anchor-1',
  tenant_id: 'tenant-1',
  media_asset_id: 'media-1',
  created_by: 'user-1',
  anchor_text: 'Test anchor',
  anchor_hash: 'abc',
  page_number: 1,
  pos_x: '0.1', pos_y: '0.2', pos_w: '0.3', pos_h: '0.05',
  page_end: null, pos_x_end: null, pos_y_end: null,
  visual_asset_id: null,
  document_order: 0,
  is_broken: false,
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const MOCK_VERSION = {
  id: 'version-1',
  tenant_id: 'tenant-1',
  media_asset_id: 'media-1',
  version_number: 1,
  created_by: 'user-1',
  anchors_snapshot: [MOCK_ANCHOR],
  diff_summary: null,
  broken_anchors: [],
  ai_suggestions: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getWTC() {
  const { withTenantContext } = await import('@edusphere/db');
  return vi.mocked(withTenantContext);
}

describe('DocumentVersionService', () => {
  let service: DocumentVersionService;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the withTenantContext queue to prevent bleed between tests
    (await getWTC()).mockReset();
    service = new DocumentVersionService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // ── createVersion ─────────────────────────────────────────────────────────────

  it('creates first version with version_number=1', async () => {
    // summary provided → no prevRow query; no existing versions
    (await getWTC())
      .mockResolvedValueOnce([MOCK_ANCHOR] as never)   // anchors
      .mockResolvedValueOnce([] as never)              // existing versions
      .mockResolvedValueOnce([MOCK_VERSION] as never); // insert returning

    const result = await service.createVersion('media-1', 'Initial version', TENANT_CTX);

    expect(result.versionNumber).toBe(1);
    expect(result.anchorCount).toBe(1);
    expect(result.brokenAnchorCount).toBe(0);
  });

  it('increments version_number on second create', async () => {
    // summary=null + existing v1 → triggers prevRow query (4 calls total)
    const v2 = { ...MOCK_VERSION, id: 'version-2', version_number: 2 };
    (await getWTC())
      .mockResolvedValueOnce([MOCK_ANCHOR] as never)              // anchors
      .mockResolvedValueOnce([{ versionNumber: 1 }] as never)    // existing versions
      .mockResolvedValueOnce([MOCK_VERSION] as never)             // prevRow diff query
      .mockResolvedValueOnce([v2] as never);                      // insert returning

    const result = await service.createVersion('media-1', null, TENANT_CTX);
    expect(result.versionNumber).toBe(2);
  });

  it('counts broken anchors correctly', async () => {
    const brokenAnchor = { ...MOCK_ANCHOR, is_broken: true };
    const rowWithBroken = { ...MOCK_VERSION, broken_anchors: ['anchor-1'] };
    (await getWTC())
      .mockResolvedValueOnce([brokenAnchor] as never)  // anchors
      .mockResolvedValueOnce([] as never)              // existing versions (none)
      .mockResolvedValueOnce([rowWithBroken] as never);// insert returning

    const result = await service.createVersion('media-1', null, TENANT_CTX);
    expect(result.brokenAnchorCount).toBe(1);
  });

  // ── rollbackToVersion ─────────────────────────────────────────────────────────

  it('throws NotFoundException when version not found', async () => {
    (await getWTC()).mockResolvedValueOnce([] as never); // select returns empty

    await expect(service.rollbackToVersion('missing-id', TENANT_CTX)).rejects.toThrow(NotFoundException);
  });

  it('soft-deletes current anchors and re-inserts snapshot', async () => {
    // MOCK_VERSION has anchors_snapshot=[MOCK_ANCHOR] so snapshot.length > 0 → 3 calls
    (await getWTC())
      .mockResolvedValueOnce([MOCK_VERSION] as never)  // load version
      .mockResolvedValueOnce(undefined as never)        // soft-delete update
      .mockResolvedValueOnce(undefined as never);       // re-insert

    const result = await service.rollbackToVersion('version-1', TENANT_CTX);
    expect(result).toBe(true);
  });

  // ── getVersionHistory ─────────────────────────────────────────────────────────

  it('returns versions ordered by version_number DESC', async () => {
    (await getWTC()).mockResolvedValueOnce([MOCK_VERSION] as never);

    const result = await service.getVersionHistory('media-1', TENANT_CTX);
    expect(result).toHaveLength(1);
    expect(result[0]?.versionNumber).toBe(1);
  });

  // ── onModuleDestroy ───────────────────────────────────────────────────────────

  it('calls closeAllPools on destroy', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });
});
