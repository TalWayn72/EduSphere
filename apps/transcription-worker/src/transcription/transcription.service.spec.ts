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

// Mock fs/promises unlink
vi.mock('fs/promises', () => ({
  unlink: vi.fn().mockResolvedValue(undefined),
}));

import { TranscriptionService } from './transcription.service';
import type { MediaUploadedEvent } from './transcription.types';

const makeEvent = (overrides: Partial<MediaUploadedEvent> = {}): MediaUploadedEvent => ({
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

  const mockConceptExtractor = {
    extract: vi.fn().mockResolvedValue([]),
  };

  const mockGraphBuilder = {
    publishConcepts: vi.fn().mockResolvedValue(undefined),
  };

  const mockHls = {
    transcodeToHls: vi.fn().mockResolvedValue(null),
    getManifestPresignedUrl: vi.fn().mockResolvedValue('https://minio/hls/master.m3u8'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TranscriptionService(
      mockWhisper as any,
      mockMinio as any,
      mockNats as any,
      mockConceptExtractor as any,
      mockGraphBuilder as any,
      mockHls as any,
    );
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
      mockWhisper.transcribe.mockRejectedValueOnce(new Error('Whisper timeout'));

      await expect(service.transcribeFile(makeEvent())).resolves.toBeUndefined();
      expect(mockNats.publish).toHaveBeenCalledWith(
        'transcription.failed',
        expect.objectContaining({
          assetId: 'asset-uuid',
          error: 'Whisper timeout',
        })
      );
    });

    it('publishes transcription.failed when MinIO download fails', async () => {
      mockMinio.downloadToTemp.mockRejectedValueOnce(new Error('MinIO unreachable'));

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
        expect.objectContaining({ assetId: 'asset-uuid' }),
      );

      await new Promise((r) => setTimeout(r, 20));

      expect(mockHls.transcodeToHls).toHaveBeenCalledWith(
        'tenant/course/id/lecture.mp4',
        'tenant-uuid/course-uuid/asset-uuid/hls',
      );
    });

    it('does not fail transcription when HLS transcode rejects', async () => {
      mockHls.transcodeToHls.mockRejectedValueOnce(new Error('FFmpeg unavailable'));

      const videoEvent = makeEvent({
        fileKey: 'tenant/course/id/lecture.mp4',
        contentType: 'video/mp4',
      });

      await expect(service.transcribeFile(videoEvent)).resolves.toBeUndefined();

      expect(mockNats.publish).toHaveBeenCalledWith(
        'transcription.completed',
        expect.objectContaining({ assetId: 'asset-uuid' }),
      );

      await new Promise((r) => setTimeout(r, 20));
    });
  });
});
