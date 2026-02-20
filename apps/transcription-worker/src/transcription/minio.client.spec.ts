import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @aws-sdk/client-s3 before importing the module
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  GetObjectCommand: vi.fn().mockImplementation((args) => args),
}));

// Mock stream/promises pipeline
vi.mock('stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

// Mock fs createWriteStream
vi.mock('fs', async () => ({
  createWriteStream: vi.fn().mockReturnValue({ on: vi.fn(), write: vi.fn(), end: vi.fn() }),
}));

describe('MinioClient', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('reads env vars and creates S3Client', async () => {
      process.env.MINIO_ENDPOINT = 'http://minio:9000';
      process.env.MINIO_ACCESS_KEY = 'access';
      process.env.MINIO_SECRET_KEY = 'secret';
      process.env.MINIO_BUCKET = 'test-bucket';

      const { S3Client } = await import('@aws-sdk/client-s3');
      const { MinioClient } = await import('./minio.client');
      const client = new MinioClient();

      expect(client).toBeDefined();
      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://minio:9000',
          forcePathStyle: true,
        })
      );
    });

    it('falls back to defaults when env vars are absent', async () => {
      delete process.env.MINIO_ENDPOINT;
      delete process.env.MINIO_ACCESS_KEY;
      delete process.env.MINIO_SECRET_KEY;
      delete process.env.MINIO_BUCKET;

      const { S3Client } = await import('@aws-sdk/client-s3');
      const { MinioClient } = await import('./minio.client');
      const client = new MinioClient();

      expect(client).toBeDefined();
      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: 'http://localhost:9000' })
      );
    });
  });

  describe('downloadToTemp', () => {
    it('calls S3Client.send with GetObjectCommand and pipes body to temp file', async () => {
      const { Readable } = await import('stream');
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { pipeline } = await import('stream/promises');

      const mockBody = Readable.from(['audio data']);
      const mockSend = vi.fn().mockResolvedValue({ Body: mockBody });
      (S3Client as any).mockImplementation(() => ({ send: mockSend }));

      const { MinioClient } = await import('./minio.client');
      const client = new MinioClient();
      const tempPath = await client.downloadToTemp('media/lecture.mp3');

      expect(mockSend).toHaveBeenCalled();
      expect(GetObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({ Key: 'media/lecture.mp3' })
      );
      expect(pipeline).toHaveBeenCalled();
      expect(tempPath).toMatch(/transcription-\d+-\w+\.mp3$/);
    });

    it('throws InternalServerErrorException when Body is null', async () => {
      const { S3Client } = await import('@aws-sdk/client-s3');
      const mockSend = vi.fn().mockResolvedValue({ Body: null });
      (S3Client as any).mockImplementation(() => ({ send: mockSend }));

      const { MinioClient } = await import('./minio.client');
      const client = new MinioClient();
      await expect(client.downloadToTemp('missing.mp3')).rejects.toThrow(
        'MinIO download failed for key: missing.mp3'
      );
    });
  });
});
