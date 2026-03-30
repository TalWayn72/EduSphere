/**
 * VisualAnchorQueryService unit tests — read-only visual anchor queries.
 * 12 tests covering findAllByMediaAsset, findAllAssetsByCourse,
 * searchVisualAssets, mapAnchor, mapAsset, and cleanup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockWithTenantContext, mockCloseAllPools, mockGetSignedUrl } =
  vi.hoisted(() => ({
    mockWithTenantContext: vi.fn(),
    mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
    mockGetSignedUrl: vi.fn(),
  }));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  withTenantContext: mockWithTenantContext,
  schema: {
    visualAnchors: {
      media_asset_id: 'media_asset_id',
      deleted_at: 'deleted_at',
      document_order: 'document_order',
    },
    visualAssets: {
      id: 'id',
      course_id: 'course_id',
      filename: 'filename',
      original_name: 'original_name',
      storage_key: 'storage_key',
      mime_type: 'mime_type',
      size_bytes: 'size_bytes',
      webp_key: 'webp_key',
      metadata: 'metadata',
      created_at: 'created_at',
      scan_status: 'scan_status',
      deleted_at: 'deleted_at',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  asc: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class MockS3Client {
    constructor() { /* noop */ }
  },
  GetObjectCommand: class MockGetObjectCommand {
    constructor(public input: unknown) { /* noop */ }
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock('@edusphere/config', () => ({
  minioConfig: {
    bucket: 'test-bucket',
    endpoint: 'localhost',
    port: 9000,
    region: 'us-east-1',
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { VisualAnchorQueryService } from './visual-anchor-query.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_CTX = { tenantId: 'tenant-1', userId: 'user-1', userRole: 'INSTRUCTOR' as const };

function makeAnchorRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'anchor-1',
    media_asset_id: 'media-1',
    anchor_text: 'Figure 1',
    page_number: 3,
    pos_x: 10,
    pos_y: 20,
    pos_w: 100,
    pos_h: 50,
    page_end: null,
    pos_x_end: null,
    pos_y_end: null,
    visual_asset_id: 'asset-1',
    document_order: 1,
    is_broken: false,
    created_at: new Date('2025-06-01'),
    updated_at: new Date('2025-06-01'),
    ...overrides,
  };
}

function makeAssetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'asset-1',
    course_id: 'course-1',
    original_name: 'diagram.png',
    mime_type: 'image/png',
    size_bytes: BigInt(12345),
    storage_key: 'uploads/diagram.png',
    webp_key: 'uploads/diagram.webp',
    metadata: { width: 800, height: 600 },
    created_at: new Date('2025-06-01'),
    scan_status: 'CLEAN',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VisualAnchorQueryService', () => {
  let svc: VisualAnchorQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new VisualAnchorQueryService();
  });

  it('constructs without errors', () => {
    expect(svc).toBeInstanceOf(VisualAnchorQueryService);
  });

  it('onModuleDestroy calls closeAllPools', async () => {
    await svc.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // ── findAllByMediaAsset ───────────────────────────────────────────────────

  it('findAllByMediaAsset returns mapped anchors', async () => {
    mockWithTenantContext.mockResolvedValueOnce([makeAnchorRow()]);

    const results = await svc.findAllByMediaAsset('media-1', AUTH_CTX);

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('anchor-1');
    expect(results[0]!.anchorText).toBe('Figure 1');
  });

  it('findAllByMediaAsset returns empty when no anchors exist', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    const results = await svc.findAllByMediaAsset('media-1', AUTH_CTX);

    expect(results).toEqual([]);
  });

  // ── findAllAssetsByCourse ─────────────────────────────────────────────────

  it('findAllAssetsByCourse returns mapped assets with presigned URLs', async () => {
    mockWithTenantContext.mockResolvedValueOnce([makeAssetRow()]);
    mockGetSignedUrl
      .mockResolvedValueOnce('https://signed-url/diagram.png')
      .mockResolvedValueOnce('https://signed-url/diagram.webp');

    const results = await svc.findAllAssetsByCourse('course-1', AUTH_CTX);

    expect(results).toHaveLength(1);
    expect(results[0]!.storageUrl).toBe('https://signed-url/diagram.png');
    expect(results[0]!.webpUrl).toBe('https://signed-url/diagram.webp');
  });

  it('findAllAssetsByCourse returns empty when no assets exist', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    const results = await svc.findAllAssetsByCourse('course-1', AUTH_CTX);

    expect(results).toEqual([]);
  });

  // ── searchVisualAssets ────────────────────────────────────────────────────

  it('searchVisualAssets filters by query string (case-insensitive)', async () => {
    const assets = [
      makeAssetRow({ id: 'a-1', original_name: 'Architecture Diagram.png' }),
      makeAssetRow({ id: 'a-2', original_name: 'Photo.jpg' }),
    ];
    mockWithTenantContext.mockResolvedValueOnce(assets);

    const results = await svc.searchVisualAssets('course-1', 'diagram', AUTH_CTX);

    expect(results).toHaveLength(1);
    expect(results[0]!.asset.id).toBe('a-1');
  });

  it('searchVisualAssets returns empty when no match', async () => {
    mockWithTenantContext.mockResolvedValueOnce([
      makeAssetRow({ original_name: 'Photo.jpg' }),
    ]);

    const results = await svc.searchVisualAssets('course-1', 'nonexistent', AUTH_CTX);

    expect(results).toEqual([]);
  });

  // ── mapAnchor ─────────────────────────────────────────────────────────────

  it('mapAnchor maps all anchor fields correctly', () => {
    const row = makeAnchorRow() as never;
    const mapped = svc.mapAnchor(row);

    expect(mapped.id).toBe('anchor-1');
    expect(mapped.mediaAssetId).toBe('media-1');
    expect(mapped.pageNumber).toBe(3);
    expect(mapped.posX).toBe(10);
    expect(mapped.documentOrder).toBe(1);
    expect(mapped.isBroken).toBe(false);
  });

  // ── mapAsset ──────────────────────────────────────────────────────────────

  it('mapAsset generates presigned URLs for storage and webp', async () => {
    mockGetSignedUrl
      .mockResolvedValueOnce('https://signed/storage.png')
      .mockResolvedValueOnce('https://signed/webp.webp');

    const mapped = await svc.mapAsset(makeAssetRow() as never);

    expect(mapped.storageUrl).toBe('https://signed/storage.png');
    expect(mapped.webpUrl).toBe('https://signed/webp.webp');
  });

  it('mapAsset sets webpUrl to null when no webp_key', async () => {
    mockGetSignedUrl.mockResolvedValueOnce('https://signed/storage.png');

    const mapped = await svc.mapAsset(makeAssetRow({ webp_key: null }) as never);

    expect(mapped.webpUrl).toBeNull();
  });
});
