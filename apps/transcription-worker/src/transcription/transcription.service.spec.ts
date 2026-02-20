import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { TranscriptionService } from './transcription.service';
import { WhisperClient } from './whisper.client';
import { MinioClient } from './minio.client';
import { NatsService } from '../nats/nats.service';
import { ConceptExtractor } from '../knowledge/concept-extractor';
import { GraphBuilder } from '../knowledge/graph-builder';
import { HlsService } from '../hls/hls.service';
import type { MediaUploadedEvent } from './transcription.types';

// Mock @edusphere/db so tests don't need a real DB
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
  let whisper: WhisperClient;
  let minio: MinioClient;
  let nats: NatsService;

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
    transcodeToHls: vi.fn().mockResolvedValue(null), // null = non-video, silently skipped
    getManifestPresignedUrl: vi.fn().mockResolvedValue('https://minio/hls/master.m3u8'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        TranscriptionService,
        { provide: WhisperClient, useValue: mockWhisper },
        { provide: MinioClient, useValue: mockMinio },
        { provide: NatsService, useValue: mockNats },
        { provide: ConceptExtractor, useValue: mockConceptExtractor },
        { provide: GraphBuilder, useValue: mockGraphBuilder },
        { provide: HlsService, useValue: mockHls },
      ],
    }).compile();

    service = module.get(TranscriptionService);
    whisper = module.get(WhisperClient);
    minio = module.get(MinioClient);
    nats = module.get(NatsService);
  });

  describe('transcribeFile', () => {
    it('orchestrates full happy path and publishes completed event', async () => {
      await service.transcribeFile(makeEvent());

      expect(minio.downloadToTemp).toHaveBeenCalledWith('media/test.mp3');
      expect(whisper.transcribe).toHaveBeenCalledWith('/tmp/test.mp3');
      expect(nats.publish).toHaveBeenCalledWith(
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
      expect(nats.publish).toHaveBeenCalledWith(
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
      expect(nats.publish).toHaveBeenCalledWith(
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
      expect(nats.publish).toHaveBeenCalledWith(
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

      // transcription.completed must be published before HLS resolves
      expect(nats.publish).toHaveBeenCalledWith(
        'transcription.completed',
        expect.objectContaining({ assetId: 'asset-uuid' }),
      );

      // Give the fire-and-forget HLS task time to settle
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

      expect(nats.publish).toHaveBeenCalledWith(
        'transcription.completed',
        expect.objectContaining({ assetId: 'asset-uuid' }),
      );

      // Let the rejected promise settle
      await new Promise((r) => setTimeout(r, 20));
    });
  });
});
