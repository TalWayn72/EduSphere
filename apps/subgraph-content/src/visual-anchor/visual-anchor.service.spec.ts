import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// vi.hoisted ensures these are available when vi.mock factory runs (hoisted to top)
const { mockReturning, mockWtc } = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockWtc = vi.fn();
  return { mockReturning, mockWtc };
});

const mockSet = vi.fn(() => ({ where: vi.fn(() => ({ returning: mockReturning })) }));
const mockWhere = vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]), returning: mockReturning }));
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: mockWtc,
  schema: {
    visualAnchors: { id: 'id', media_asset_id: 'media_asset_id', deleted_at: 'deleted_at', document_order: 'document_order' },
    visualAssets: { id: 'id', course_id: 'course_id', deleted_at: 'deleted_at' },
    media_assets: { id: 'id', course_id: 'course_id' },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
  isNull: vi.fn((a) => ({ isNull: a })),
  asc: vi.fn((a) => ({ asc: a })),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({ encode: vi.fn((v: string) => v) })),
}));

vi.mock('@aws-sdk/client-s3', () => {
  const mockSend = vi.fn().mockResolvedValue({});
  // Use function constructor (not arrow) — Vitest 4 requires this for 'new' calls
  function MockS3Client(this: { send: typeof mockSend }) { this.send = mockSend; }
  return {
    S3Client: MockS3Client,
    GetObjectCommand: vi.fn(),
    PutObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://minio.local/presigned'),
}));

vi.mock('@edusphere/config', () => ({
  minioConfig: { bucket: 'edusphere', endpoint: 'localhost', port: 9000, region: 'us-east-1', accessKey: 'minio', secretKey: 'minio123' },
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { VisualAnchorService } from './visual-anchor.service';

// ── Test helpers ──────────────────────────────────────────────────────────────

const TENANT_CTX = { tenantId: 'tenant-1', userId: 'user-1', userRole: 'INSTRUCTOR' as const };

const ANCHOR_ROW = {
  id: 'anchor-uuid-1',
  tenant_id: 'tenant-1',
  media_asset_id: 'media-1',
  created_by: 'user-1',
  anchor_text: 'Test anchor text',
  anchor_hash: 'abc123',
  page_number: 1,
  pos_x: '0.1',
  pos_y: '0.2',
  pos_w: '0.3',
  pos_h: '0.05',
  page_end: null,
  pos_x_end: null,
  pos_y_end: null,
  visual_asset_id: null,
  document_order: 0,
  is_broken: false,
  deleted_at: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const mockClamav = { scanBuffer: vi.fn() };
const mockImageOptimizer = {
  checkZipBomb: vi.fn().mockResolvedValue(undefined),
  verifyMagicBytes: vi.fn().mockResolvedValue('image/png'),
  extractDimensions: vi.fn().mockResolvedValue({ width: 100, height: 100 }),
  optimizeToWebP: vi.fn().mockResolvedValue(Buffer.from('webp')),
};

describe('VisualAnchorService', () => {
  let service: VisualAnchorService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReturning.mockReset(); // clear leftover mockResolvedValueOnce queue
    mockWtc.mockReset();       // clear wtc queue, then restore default passthrough
    mockWtc.mockImplementation((_db: unknown, _ctx: unknown, fn: unknown) =>
      (fn as (tx: unknown) => Promise<unknown>)({ insert: mockInsert, update: mockUpdate, select: mockSelect })
    );
    service = new VisualAnchorService(
      mockClamav as never,
      mockImageOptimizer as never
    );
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // ── createAnchor ──────────────────────────────────────────────────────────────

  it('creates anchor with simhash and returns mapped row', async () => {
    mockReturning.mockResolvedValueOnce([ANCHOR_ROW]);

    const result = await service.createAnchor(
      {
        mediaAssetId: '550e8400-e29b-41d4-a716-446655440001',
        courseId: '550e8400-e29b-41d4-a716-446655440002',
        anchorText: 'Test anchor text',
        documentOrder: 0,
      },
      TENANT_CTX
    );

    expect(result.anchorText).toBe('Test anchor text');
    expect(result.isBroken).toBe(false);
    expect(result.mediaAssetId).toBe('media-1');
  });

  it('throws when anchorText is empty', async () => {
    await expect(
      service.createAnchor(
        { mediaAssetId: '550e8400-e29b-41d4-a716-446655440001', courseId: '550e8400-e29b-41d4-a716-446655440002', anchorText: '', documentOrder: 0 },
        TENANT_CTX
      )
    ).rejects.toThrow();
  });

  it('throws when mediaAssetId is not a UUID', async () => {
    await expect(
      service.createAnchor(
        { mediaAssetId: 'not-a-uuid', courseId: 'course-1', anchorText: 'text', documentOrder: 0 },
        TENANT_CTX
      )
    ).rejects.toThrow();
  });

  // ── deleteAnchor — soft-delete + NATS ─────────────────────────────────────────

  it('soft-deletes anchor and returns true', async () => {
    mockReturning.mockResolvedValueOnce([{ id: 'anchor-uuid-1', media_asset_id: 'media-1' }]);

    const result = await service.deleteAnchor('anchor-uuid-1', TENANT_CTX);
    expect(result).toBe(true);
  });

  it('throws NotFoundException when anchor not found on delete', async () => {
    mockReturning.mockResolvedValueOnce([]);
    await expect(service.deleteAnchor('missing-id', TENANT_CTX)).rejects.toThrow(NotFoundException);
  });

  // ── assignAsset ───────────────────────────────────────────────────────────────
  // assignAsset makes 4 withTenantContext calls:
  //   1. select anchor  2. select media_asset  3. select visual_asset  4. update+returning
  // Calls 1-3 return arrays directly (select without orderBy), so we use mockWtc.mockResolvedValueOnce.
  // Call 4 goes through mockUpdate → mockSet → mockWhere → mockReturning.

  it('assigns visual asset to anchor', async () => {
    const MEDIA_ASSET_ROW = { course_id: 'course-1' };
    const VISUAL_ASSET_ROW = { course_id: 'course-1' };
    const withAsset = { ...ANCHOR_ROW, visual_asset_id: 'asset-uuid-1' };
    mockWtc
      .mockResolvedValueOnce([ANCHOR_ROW])       // 1. select anchor
      .mockResolvedValueOnce([MEDIA_ASSET_ROW])  // 2. select media_asset
      .mockResolvedValueOnce([VISUAL_ASSET_ROW]); // 3. select visual_asset
    // 4. update+returning uses the passthrough implementation → mockReturning
    mockWtc.mockImplementationOnce((_db: unknown, _ctx: unknown, fn: unknown) =>
      (fn as (tx: unknown) => Promise<unknown>)({ insert: mockInsert, update: mockUpdate, select: mockSelect })
    );
    mockReturning.mockResolvedValueOnce([withAsset]);

    const result = await service.assignAsset('anchor-uuid-1', 'asset-uuid-1', TENANT_CTX);
    expect(result.visualAssetId).toBe('asset-uuid-1');
  });

  it('throws NotFoundException when anchor not found on assign', async () => {
    mockWtc.mockResolvedValueOnce([]); // 1. select anchor returns empty
    await expect(service.assignAsset('missing', 'asset-1', TENANT_CTX)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException on cross-course assignment', async () => {
    const MEDIA_ASSET_ROW = { course_id: 'course-A' };
    const VISUAL_ASSET_ROW = { course_id: 'course-B' }; // different course → cross-course block
    mockWtc
      .mockResolvedValueOnce([ANCHOR_ROW])       // 1. select anchor
      .mockResolvedValueOnce([MEDIA_ASSET_ROW])  // 2. select media_asset
      .mockResolvedValueOnce([VISUAL_ASSET_ROW]); // 3. select visual_asset (different course)

    await expect(service.assignAsset('anchor-uuid-1', 'asset-uuid-1', TENANT_CTX)).rejects.toThrow(BadRequestException);
  });

  // ── confirmVisualAssetUpload — INFECTED path ──────────────────────────────────

  it('throws BadRequestException when ClamAV detects infection', async () => {
    mockClamav.scanBuffer = vi.fn().mockResolvedValue({
      isInfected: true,
      viruses: ['EICAR-Test-Signature'],
      hasError: false,
    });

    // Override S3 send to return a stream for GetObject
    const readable = Readable.from(Buffer.from('eicar'));
    const s3 = (service as unknown as { s3: { send: ReturnType<typeof vi.fn> } }).s3;
    s3.send = vi.fn().mockResolvedValue({ Body: readable });

    await expect(
      service.confirmVisualAssetUpload(
        'quarantine/eicar.com',
        'course-1',
        'eicar.com',
        'image/png',
        1024,
        TENANT_CTX
      )
    ).rejects.toThrow(BadRequestException);
  });

  // ── confirmVisualAssetUpload — too large ──────────────────────────────────────

  it('throws BadRequestException for oversized declared size', async () => {
    await expect(
      service.confirmVisualAssetUpload(
        'quarantine/big.png',
        'course-1',
        'big.png',
        'image/png',
        16 * 1024 * 1024, // 16MB > 15MB limit
        TENANT_CTX
      )
    ).rejects.toThrow(BadRequestException);
  });

  // ── onModuleDestroy ───────────────────────────────────────────────────────────

  it('calls closeAllPools on destroy', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });
});
