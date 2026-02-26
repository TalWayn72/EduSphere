import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock @aws-sdk/client-s3 ──────────────────────────────────────────────────
const mockS3Send = vi.fn();
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function () {
    return { send: mockS3Send };
  }),
  PutObjectCommand: vi.fn().mockImplementation(function (args) {
    return args;
  }),
  GetObjectCommand: vi.fn().mockImplementation(function (args) {
    return args;
  }),
}));

// ── Mock @aws-sdk/s3-request-presigner ──────────────────────────────────────
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://minio/presigned-url'),
}));

// ── Mock mime-types ───────────────────────────────────────────────────────────
vi.mock('mime-types', () => ({
  lookup: vi.fn().mockImplementation((name: string) => {
    if (name.endsWith('.mp4')) return 'video/mp4';
    if (name.endsWith('.m3u8')) return 'application/x-mpegurl';
    if (name.endsWith('.ts')) return 'video/mp2t';
    if (name.endsWith('.mp3')) return 'audio/mpeg';
    if (name.endsWith('.pdf')) return 'application/pdf';
    return false;
  }),
}));

// ── Mock child_process.spawn ─────────────────────────────────────────────────
const mockStderrOn = vi.fn();
const mockFfmpegOn = vi.fn();
const mockSpawnReturn = {
  stderr: { on: mockStderrOn },
  on: mockFfmpegOn,
  stdio: [],
};
vi.mock('child_process', () => ({
  spawn: vi.fn().mockReturnValue(mockSpawnReturn),
}));

// ── Mock fs/promises ─────────────────────────────────────────────────────────
const mockMkdir = vi.fn().mockResolvedValue(undefined);
const mockReaddir = vi
  .fn()
  .mockResolvedValue(['master.m3u8', '720p.m3u8', '720p_0000.ts']);
const mockUnlink = vi.fn().mockResolvedValue(undefined);
const mockRmdir = vi.fn().mockResolvedValue(undefined);
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
vi.mock('fs/promises', () => ({
  mkdir: mockMkdir,
  readdir: mockReaddir,
  unlink: mockUnlink,
  rmdir: mockRmdir,
  writeFile: mockWriteFile,
}));

// ── Mock fs ──────────────────────────────────────────────────────────────────
vi.mock('fs', () => ({
  createReadStream: vi.fn().mockReturnValue({ pipe: vi.fn() }),
  createWriteStream: vi
    .fn()
    .mockReturnValue({ write: vi.fn(), end: vi.fn(), on: vi.fn() }),
}));

// ── Mock stream/promises ─────────────────────────────────────────────────────
vi.mock('stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock stream ───────────────────────────────────────────────────────────────
vi.mock('stream', () => ({
  Readable: class {},
}));

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper: simulates FFmpeg process emitting 'data' on stderr then 'close'.
 * Called inside a single tick via Promise.resolve().then() so the service's
 * spawn-based promise resolves correctly.
 */
function simulateFfmpegSuccess(
  durationLine = 'Duration: 00:10:30.00, start: 0'
) {
  // FFmpeg stderr data callback
  const stderrCallback = mockStderrOn.mock.calls.find(
    ([event]: [string]) => event === 'data'
  )?.[1] as ((data: Buffer) => void) | undefined;
  if (stderrCallback) stderrCallback(Buffer.from(durationLine));

  // FFmpeg close callback with code 0
  const closeCallback = mockFfmpegOn.mock.calls.find(
    ([event]: [string]) => event === 'close'
  )?.[1] as ((code: number) => void) | undefined;
  if (closeCallback) closeCallback(0);
}

function simulateFfmpegFailure(code = 1) {
  const closeCallback = mockFfmpegOn.mock.calls.find(
    ([event]: [string]) => event === 'close'
  )?.[1] as ((code: number) => void) | undefined;
  if (closeCallback) closeCallback(code);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('HlsService', () => {
  let HlsService: typeof import('./hls.service').HlsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset spawn mock to return fresh event-emitter-like object each test
    mockStderrOn.mockClear();
    mockFfmpegOn.mockClear();

    // Default S3 send: download returns readable stream
    const { Readable } = await import('stream');
    mockS3Send.mockResolvedValue({ Body: new Readable() });

    // Re-import module fresh (vi.mock is hoisted so it stays mocked)
    HlsService = (await import('./hls.service')).HlsService;
  });

  afterEach(() => {
    vi.resetModules();
  });

  // ── constructor ────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('initialises with default env vars', () => {
      const service = new HlsService();
      expect(service).toBeDefined();
    });

    it('uses MINIO_ENDPOINT env var when provided', async () => {
      process.env.MINIO_ENDPOINT = 'http://custom-minio:9001';
      const { S3Client } = await import('@aws-sdk/client-s3');
      new HlsService();
      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: 'http://custom-minio:9001' })
      );
      delete process.env.MINIO_ENDPOINT;
    });
  });

  // ── transcodeToHls — skip for non-video ────────────────────────────────────

  describe('transcodeToHls', () => {
    it('returns null for audio files without running FFmpeg', async () => {
      const { spawn } = await import('child_process');
      const service = new HlsService();
      const result = await service.transcodeToHls(
        'tenant/course/id/file.mp3',
        'tenant/course/id/hls'
      );

      expect(result).toBeNull();
      expect(spawn).not.toHaveBeenCalled();
    });

    it('returns null for PDF files without running FFmpeg', async () => {
      const { spawn } = await import('child_process');
      const service = new HlsService();
      const result = await service.transcodeToHls(
        'tenant/course/id/slide.pdf',
        'tenant/course/id/hls'
      );

      expect(result).toBeNull();
      expect(spawn).not.toHaveBeenCalled();
    });

    it('downloads source from MinIO for video files', async () => {
      const service = new HlsService();

      // Run transcodeToHls and simultaneously simulate FFmpeg success
      const transcodePromise = service.transcodeToHls(
        'tenant/course/id/video.mp4',
        'tenant/course/id/hls'
      );
      // Wait for spawn to be called (more async steps than 2 ticks)
      const { spawn } = await import('child_process');
      await new Promise<void>((resolve) => {
        const check = () => {
          if ((spawn as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
            resolve();
          } else {
            setImmediate(check);
          }
        };
        setImmediate(check);
      });
      simulateFfmpegSuccess();

      await transcodePromise;

      await import('@aws-sdk/client-s3');
      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({ Key: 'tenant/course/id/video.mp4' })
      );
    });

    it('returns manifest key and segment keys on success', async () => {
      const service = new HlsService();

      const transcodePromise = service.transcodeToHls(
        'tenant/course/id/video.mp4',
        'tenant/course/id/hls'
      );
      // Wait for spawn to be called before simulating FFmpeg
      const { spawn: _spawn } = await import('child_process');
      await new Promise<void>((resolve) => {
        const check = () => {
          if ((_spawn as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
            resolve();
          } else {
            setImmediate(check);
          }
        };
        setImmediate(check);
      });
      simulateFfmpegSuccess('Duration: 00:10:30.00');

      const result = await transcodePromise;

      expect(result).not.toBeNull();
      expect(result?.manifestKey).toBe('tenant/course/id/hls/master.m3u8');
      expect(result?.segmentKeys.length).toBeGreaterThan(0);
      expect(result?.duration).toBeCloseTo(630, 0); // 10 min 30 sec
    });

    it('uploads every file in the output directory to MinIO', async () => {
      const service = new HlsService();

      const transcodePromise = service.transcodeToHls(
        'tenant/course/id/video.mp4',
        'tenant/course/id/hls'
      );
      // Wait for spawn to be called before simulating FFmpeg
      const { spawn: _spawn } = await import('child_process');
      await new Promise<void>((resolve) => {
        const check = () => {
          if ((_spawn as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
            resolve();
          } else {
            setImmediate(check);
          }
        };
        setImmediate(check);
      });
      simulateFfmpegSuccess();

      await transcodePromise;

      // readdir mock returns 3 files; each triggers a PutObjectCommand
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      expect(PutObjectCommand).toHaveBeenCalledTimes(3);
    });

    it('cleans up temp directory even when FFmpeg fails', async () => {
      const service = new HlsService();

      const transcodePromise = service.transcodeToHls(
        'tenant/course/id/video.mp4',
        'tenant/course/id/hls'
      );
      // Wait for spawn to be called before simulating FFmpeg
      const { spawn: _spawn } = await import('child_process');
      await new Promise<void>((resolve) => {
        const check = () => {
          if ((_spawn as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
            resolve();
          } else {
            setImmediate(check);
          }
        };
        setImmediate(check);
      });
      simulateFfmpegFailure(1);

      await expect(transcodePromise).rejects.toThrow(
        /FFmpeg exited with code 1/
      );

      // cleanup must still have been called
      expect(mockRmdir).toHaveBeenCalled();
    });

    it('cleans up temp directory on successful transcode', async () => {
      const service = new HlsService();

      const transcodePromise = service.transcodeToHls(
        'tenant/course/id/video.mp4',
        'tenant/course/id/hls'
      );
      // Wait for spawn to be called before simulating FFmpeg
      const { spawn: _spawn } = await import('child_process');
      await new Promise<void>((resolve) => {
        const check = () => {
          if ((_spawn as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
            resolve();
          } else {
            setImmediate(check);
          }
        };
        setImmediate(check);
      });
      simulateFfmpegSuccess();

      await transcodePromise;

      expect(mockRmdir).toHaveBeenCalled();
    });

    it('returns duration = 0 when FFmpeg stderr has no Duration line', async () => {
      const service = new HlsService();

      const transcodePromise = service.transcodeToHls(
        'tenant/course/id/video.mp4',
        'tenant/course/id/hls'
      );
      // Wait for spawn to be called before simulating FFmpeg
      const { spawn: _spawn } = await import('child_process');
      await new Promise<void>((resolve) => {
        const check = () => {
          if ((_spawn as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
            resolve();
          } else {
            setImmediate(check);
          }
        };
        setImmediate(check);
      });
      simulateFfmpegSuccess('No duration info here');

      const result = await transcodePromise;
      expect(result?.duration).toBe(0);
    });
  });

  // ── getManifestPresignedUrl ────────────────────────────────────────────────

  describe('getManifestPresignedUrl', () => {
    it('returns a presigned URL for a given manifest key', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const service = new HlsService();
      const url = await service.getManifestPresignedUrl(
        'tenant/course/id/hls/master.m3u8'
      );

      expect(url).toBe('https://minio/presigned-url');
      expect(getSignedUrl).toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Non-blocking integration: HLS failure must not fail TranscriptionService
// ─────────────────────────────────────────────────────────────────────────────

describe('TranscriptionService — HLS non-blocking behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transcription completes successfully even when HLS transcode rejects', async () => {
    // Mock @edusphere/db inline
    vi.mock('@edusphere/db', () => ({
      createDatabaseConnection: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'transcript-uuid' }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }),
      schema: { transcripts: {}, transcript_segments: {}, media_assets: {} },
      eq: vi.fn(),
    }));

    const { TranscriptionService } =
      await import('../transcription/transcription.service');

    const mockWhisper = {
      transcribe: vi.fn().mockResolvedValue({
        text: 'Hello',
        language: 'en',
        segments: [{ id: 0, start: 0, end: 1, text: 'Hello' }],
      }),
    };
    const mockMinio = {
      downloadToTemp: vi.fn().mockResolvedValue('/tmp/video.mp4'),
    };
    const mockNats = { publish: vi.fn().mockResolvedValue(undefined) };
    const mockConceptExtractor = { extract: vi.fn().mockResolvedValue([]) };
    const mockGraphBuilder = {
      publishConcepts: vi.fn().mockResolvedValue(undefined),
    };
    const mockHls = {
      transcodeToHls: vi
        .fn()
        .mockRejectedValue(new Error('FFmpeg not installed')),
      getManifestPresignedUrl: vi.fn(),
    };

    const service = new TranscriptionService(
      mockWhisper as any,
      mockMinio as any,
      mockNats as any,
      mockConceptExtractor as any,
      mockGraphBuilder as any,
      mockHls as any
    );

    await service.transcribeFile({
      fileKey: 'tenant/course/id/video.mp4',
      assetId: 'asset-uuid',
      courseId: 'course-uuid',
      tenantId: 'tenant-uuid',
      fileName: 'video.mp4',
      contentType: 'video/mp4',
    });

    // Transcription must have published COMPLETED despite HLS failure
    expect(mockNats.publish).toHaveBeenCalledWith(
      'transcription.completed',
      expect.objectContaining({ assetId: 'asset-uuid' })
    );

    // Give the fire-and-forget HLS promise time to settle
    await new Promise((r) => setTimeout(r, 50));

    // HLS was attempted
    expect(mockHls.transcodeToHls).toHaveBeenCalledWith(
      'tenant/course/id/video.mp4',
      'tenant-uuid/course-uuid/asset-uuid/hls'
    );
  });
});
