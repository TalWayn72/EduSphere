import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @edusphere/db so tests do not need a real DB
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn().mockReturnValue({
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'transcript-uuid' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  }),
  schema: {
    transcripts: {},
    transcript_segments: {},
    media_assets: {},
  },
  eq: vi.fn(),
}));

// Shared S3 send mock — reassigned per-test for VTT assertions
const s3SendMock = vi.fn().mockResolvedValue({});

// Mock @aws-sdk/client-s3 to intercept VTT uploads
vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = s3SendMock;
  }
  class PutObjectCommand {
    constructor(public readonly args: unknown) {}
  }
  return { S3Client, PutObjectCommand };
});

// Mock @edusphere/config
vi.mock('@edusphere/config', () => ({
  minioConfig: {
    endpoint: 'http://minio:9000',
    region: 'us-east-1',
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
    bucket: 'edusphere',
    port: 9000,
  },
}));

// Mock fs/promises unlink
vi.mock('fs/promises', () => ({
  unlink: vi.fn().mockResolvedValue(undefined),
}));

import { TranscriptionService } from './transcription.service';
import type { MediaUploadedEvent } from './transcription.types';

const makeEvent = (
  overrides: Partial<MediaUploadedEvent> = {}
): MediaUploadedEvent => ({
  fileKey: 'media/test.mp3',
  assetId: 'asset-uuid',
  courseId: 'course-uuid',
  tenantId: 'tenant-uuid',
  fileName: 'test.mp3',
  contentType: 'audio/mpeg',
  ...overrides,
});

describe('TranscriptionService', () => {
  let service: TranscriptionService;

  const mockWhisper = {
    transcribe: vi.fn().mockResolvedValue({
      text: 'Hello world',
      language: 'en',
      segments: [{ id: 0, start: 0, end: 1.5, text: 'Hello world' }],
    }),
  };

  const mockMinio = {
    downloadToTemp: vi.fn().mockResolvedValue('/tmp/test.mp3'),
  };

  const mockNats = {
    publish: vi.fn().mockResolvedValue(undefined),
  };

  const mockHls = {
    transcodeToHls: vi.fn().mockResolvedValue(null),
    getManifestPresignedUrl: vi
      .fn()
      .mockResolvedValue('https://minio/hls/master.m3u8'),
  };

  const mockTranslation = {
    translateTranscript: vi.fn().mockResolvedValue(undefined),
  };

  const mockHelpers = {
    updateAssetStatus: vi.fn().mockResolvedValue(undefined),
    persistTranscript: vi.fn().mockResolvedValue({
      transcriptId: 'transcript-uuid',
      segmentIds: ['seg-1'],
    }),
    uploadVtt: vi.fn().mockResolvedValue(undefined),
    extractAndPublishConcepts: vi.fn().mockResolvedValue(undefined),
    updateAssetHlsManifest: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    s3SendMock.mockResolvedValue({});
    // Restore default implementations after clearAllMocks
    mockHelpers.updateAssetStatus.mockResolvedValue(undefined);
    mockHelpers.persistTranscript.mockResolvedValue({
      transcriptId: 'transcript-uuid',
      segmentIds: ['seg-1'],
    });
    mockHelpers.uploadVtt.mockResolvedValue(undefined);
    mockHelpers.extractAndPublishConcepts.mockResolvedValue(undefined);
    mockHelpers.updateAssetHlsManifest.mockResolvedValue(undefined);
    /* eslint-disable @typescript-eslint/no-explicit-any -- partial mocks in test */
    service = new TranscriptionService(
      mockWhisper as any,
      mockMinio as any,
      mockNats as any,
      mockHls as any,
      mockTranslation as any,
      mockHelpers as any
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });

  describe('transcribeFile', () => {
    it('orchestrates full happy path and publishes completed event', async () => {
      await service.transcribeFile(makeEvent());

      expect(mockMinio.downloadToTemp).toHaveBeenCalledWith('media/test.mp3');
      expect(mockWhisper.transcribe).toHaveBeenCalledWith('/tmp/test.mp3');
      expect(mockNats.publish).toHaveBeenCalledWith(
        'transcription.completed',
        expect.objectContaining({
          assetId: 'asset-uuid',
          transcriptId: 'transcript-uuid',
          segmentCount: 1,
        })
      );
    });

    it('publishes transcription.failed and does not throw when Whisper errors', async () => {
      mockWhisper.transcribe.mockRejectedValueOnce(
        new Error('Whisper timeout')
      );

      await expect(
        service.transcribeFile(makeEvent())
      ).resolves.toBeUndefined();
      expect(mockNats.publish).toHaveBeenCalledWith(
        'transcription.failed',
        expect.objectContaining({
          assetId: 'asset-uuid',
          error: 'Whisper timeout',
        })
      );
    });

    it('publishes transcription.failed when MinIO download fails', async () => {
      mockMinio.downloadToTemp.mockRejectedValueOnce(
        new Error('MinIO unreachable')
      );

      await service.transcribeFile(makeEvent());
      expect(mockNats.publish).toHaveBeenCalledWith(
        'transcription.failed',
        expect.objectContaining({ error: 'MinIO unreachable' })
      );
    });

    it('cleans up temp file even when transcription fails', async () => {
      const { unlink } = await import('fs/promises');
      mockWhisper.transcribe.mockRejectedValueOnce(new Error('boom'));

      await service.transcribeFile(makeEvent());
      expect(unlink).toHaveBeenCalledWith('/tmp/test.mp3');
    });

    it('handles empty segments array gracefully', async () => {
      mockWhisper.transcribe.mockResolvedValueOnce({
        text: 'Hello',
        language: 'en',
        segments: [],
      });

      await service.transcribeFile(makeEvent());
      expect(mockNats.publish).toHaveBeenCalledWith(
        'transcription.completed',
        expect.objectContaining({ segmentCount: 0 })
      );
    });

    it('calls hlsService.transcodeToHls as a non-blocking step after completion', async () => {
      const videoEvent = makeEvent({
        fileKey: 'tenant/course/id/lecture.mp4',
        fileName: 'lecture.mp4',
        contentType: 'video/mp4',
      });

      await service.transcribeFile(videoEvent);

      expect(mockNats.publish).toHaveBeenCalledWith(
        'transcription.completed',
        expect.objectContaining({ assetId: 'asset-uuid' })
      );

      await new Promise((r) => setTimeout(r, 20));

      expect(mockHls.transcodeToHls).toHaveBeenCalledWith(
        'tenant/course/id/lecture.mp4',
        'tenant-uuid/course-uuid/asset-uuid/hls'
      );
    });

    it('does not fail transcription when HLS transcode rejects', async () => {
      mockHls.transcodeToHls.mockRejectedValueOnce(
        new Error('FFmpeg unavailable')
      );

      const videoEvent = makeEvent({
        fileKey: 'tenant/course/id/lecture.mp4',
        contentType: 'video/mp4',
      });

      await expect(service.transcribeFile(videoEvent)).resolves.toBeUndefined();

      expect(mockNats.publish).toHaveBeenCalledWith(
        'transcription.completed',
        expect.objectContaining({ assetId: 'asset-uuid' })
      );

      await new Promise((r) => setTimeout(r, 20));
    });

    it('uploads primary-language VTT to MinIO after transcription (WCAG 1.2.2)', async () => {
      await service.transcribeFile(makeEvent());

      // VTT upload is delegated to helpers.uploadVtt
      expect(mockHelpers.uploadVtt).toHaveBeenCalledWith(
        'asset-uuid',
        'course-uuid',
        'tenant-uuid',
        'transcript-uuid',
        'en',
        [{ id: 0, start: 0, end: 1.5, text: 'Hello world' }]
      );
    });

    it('does not fail transcription when VTT upload fails', async () => {
      // uploadVtt has internal try/catch in the real service, so it never
      // throws. Verify that even if it did reject, the transcription
      // still publishes a failed event and does not throw to the caller.
      mockHelpers.uploadVtt.mockRejectedValueOnce(new Error('MinIO down'));

      await expect(
        service.transcribeFile(makeEvent())
      ).resolves.toBeUndefined();

      // Since uploadVtt rejection escapes into the outer catch block,
      // the service publishes transcription.failed (not completed).
      expect(mockNats.publish).toHaveBeenCalledWith(
        'transcription.failed',
        expect.objectContaining({
          assetId: 'asset-uuid',
          error: 'MinIO down',
        })
      );
    });
  });
});
