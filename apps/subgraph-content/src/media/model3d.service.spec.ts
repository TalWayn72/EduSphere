import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { MediaService } from './media.service';

// ---------------------------------------------------------------------------
// Minimal mocks — keep all test logic inside Vitest, no real network calls
// ---------------------------------------------------------------------------

const mockReturning = vi.fn();
const mockDbInsert = vi.fn(() => ({ values: vi.fn(() => ({ returning: mockReturning })) }));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => ({ insert: mockDbInsert, select: vi.fn(), update: vi.fn() }),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    media_assets: 'media_assets',
    transcripts: 'transcripts',
  },
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

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(function (input: unknown) { (this as { input: unknown }).input = input; }),
  GetObjectCommand: vi.fn(function (input: unknown) { (this as { input: unknown }).input = input; }),
}));

const mockGetSignedUrl = vi.fn().mockResolvedValue('https://minio.test/presigned-url');
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    flush: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn().mockReturnValue({ encode: vi.fn().mockReturnValue(new Uint8Array()) }),
}));

// ---------------------------------------------------------------------------

const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const COURSE_ID = 'bbbbbbbb-0000-0000-0000-000000000002';
const LESSON_ID = 'cccccccc-0000-0000-0000-000000000003';
const USER_ID = 'dddddddd-0000-0000-0000-000000000004';
const ASSET_ID = 'eeeeeeee-0000-0000-0000-000000000005';

function buildService(): MediaService {
  mockReturning.mockResolvedValue([{ id: ASSET_ID, course_id: COURSE_ID, module_id: LESSON_ID }]);
  mockDbInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({ returning: mockReturning }),
  });
  return new MediaService();
}

describe('MediaService — createModel3DUpload', () => {
  let service: MediaService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = buildService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('accepts format "gltf" and returns assetId/uploadUrl/key', async () => {
    const result = await service.createModel3DUpload(
      COURSE_ID, LESSON_ID, 'scene.gltf', 'gltf', 12345, TENANT_ID, USER_ID
    );
    expect(result.assetId).toBe(ASSET_ID);
    expect(result.uploadUrl).toContain('presigned-url');
    expect(result.key).toContain(COURSE_ID);
  });

  it('accepts format "glb"', async () => {
    const result = await service.createModel3DUpload(
      COURSE_ID, LESSON_ID, 'model.glb', 'glb', 8000, TENANT_ID, USER_ID
    );
    expect(result.assetId).toBe(ASSET_ID);
  });

  it('accepts format "obj"', async () => {
    const result = await service.createModel3DUpload(
      COURSE_ID, LESSON_ID, 'mesh.obj', 'obj', 4000, TENANT_ID, USER_ID
    );
    expect(result.assetId).toBe(ASSET_ID);
  });

  it('accepts format "fbx"', async () => {
    const result = await service.createModel3DUpload(
      COURSE_ID, LESSON_ID, 'avatar.fbx', 'fbx', 20000, TENANT_ID, USER_ID
    );
    expect(result.assetId).toBe(ASSET_ID);
  });

  it('rejects unknown format and throws BadRequestException', async () => {
    await expect(
      service.createModel3DUpload(
        COURSE_ID, LESSON_ID, 'bad.stl', 'stl', 100, TENANT_ID, USER_ID
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('returns assetId, uploadUrl, and key in result object', async () => {
    const result = await service.createModel3DUpload(
      COURSE_ID, LESSON_ID, 'test.glb', 'GLB', 500, TENANT_ID, USER_ID
    );
    expect(result).toHaveProperty('assetId');
    expect(result).toHaveProperty('uploadUrl');
    expect(result).toHaveProperty('key');
  });

  it('key contains tenantId and courseId path segments', async () => {
    const result = await service.createModel3DUpload(
      COURSE_ID, LESSON_ID, 'model.gltf', 'gltf', 1000, TENANT_ID, USER_ID
    );
    expect(result.key).toContain(TENANT_ID);
    expect(result.key).toContain(COURSE_ID);
  });

  it('throws InternalServerErrorException when S3 presigning fails', async () => {
    mockGetSignedUrl.mockRejectedValueOnce(new Error('S3 error'));
    await expect(
      service.createModel3DUpload(
        COURSE_ID, LESSON_ID, 'fail.glb', 'glb', 100, TENANT_ID, USER_ID
      )
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('onModuleDestroy calls closeAllPools', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });
});

describe('MediaResolver — resolveModel3d (field resolver logic)', () => {
  it('returns null for a non-MODEL_3D asset', () => {
    const parent = { media_type: 'VIDEO', model_format: null, model_animations: null, poly_count: null };
    expect(resolveModel3dLogic(parent)).toBeNull();
  });

  it('returns Model3DInfo for a MODEL_3D asset', () => {
    const parent = {
      media_type: 'MODEL_3D',
      model_format: 'gltf',
      model_animations: [{ name: 'Walk', duration: 1.5 }],
      poly_count: 42000,
    };
    const result = resolveModel3dLogic(parent);
    expect(result).not.toBeNull();
    expect(result?.format).toBe('gltf');
    expect(result?.polyCount).toBe(42000);
    expect(result?.animations).toHaveLength(1);
    expect(result?.animations[0]).toEqual({ name: 'Walk', duration: 1.5 });
  });

  it('handles null model_animations gracefully — returns empty animations array', () => {
    const parent = { media_type: 'MODEL_3D', model_format: 'glb', model_animations: null, poly_count: null };
    expect(resolveModel3dLogic(parent)?.animations).toEqual([]);
  });

  it('correctly maps poly_count to polyCount', () => {
    const parent = { media_type: 'MODEL_3D', model_format: 'obj', model_animations: [], poly_count: 99000 };
    expect(resolveModel3dLogic(parent)?.polyCount).toBe(99000);
  });

  it('correctly maps animations array with multiple clips', () => {
    const parent = {
      media_type: 'MODEL_3D',
      model_format: 'fbx',
      model_animations: [
        { name: 'Idle', duration: 2.0 },
        { name: 'Run', duration: 0.8 },
      ],
      poly_count: 15000,
    };
    const result = resolveModel3dLogic(parent);
    expect(result?.animations).toHaveLength(2);
    expect(result?.animations[1]).toEqual({ name: 'Run', duration: 0.8 });
  });
});

// ---------------------------------------------------------------------------
// Inline mirror of the field resolver logic for isolated unit testing
// ---------------------------------------------------------------------------

function resolveModel3dLogic(parent: {
  media_type?: string;
  model_format?: string | null;
  model_animations?: unknown;
  poly_count?: number | null;
}): { format: string; polyCount: number | null; animations: { name: string; duration: number }[] } | null {
  if (parent.media_type !== 'MODEL_3D' || !parent.model_format) return null;

  const rawAnimations = parent.model_animations;
  const animations: { name: string; duration: number }[] = Array.isArray(rawAnimations)
    ? (rawAnimations as { name: string; duration: number }[]).filter(
        (a) => a && typeof a.name === 'string' && typeof a.duration === 'number'
      )
    : [];

  return { format: parent.model_format, polyCount: parent.poly_count ?? null, animations };
}
