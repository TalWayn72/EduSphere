import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { TranscriptionWorker } from './transcription.worker';
import { TranscriptionService } from './transcription.service';
import { NatsService } from '../nats/nats.service';

describe('TranscriptionWorker', () => {
  let worker: TranscriptionWorker;
  let transcriptionService: TranscriptionService;
  let natsService: NatsService;

  const mockTranscriptionService = {
    transcribeFile: vi.fn().mockResolvedValue(undefined),
  };

  // Minimal async-iterable subscription mock
  const makeSubscription = (messages: string[]) => {
    let index = 0;
    const sc = { decode: (d: Uint8Array) => Buffer.from(d).toString() };
    return {
      [Symbol.asyncIterator]() {
        return {
          next() {
            if (index < messages.length) {
              return Promise.resolve({
                done: false,
                value: { data: Buffer.from(messages[index++]) },
              });
            }
            return Promise.resolve({ done: true, value: undefined });
          },
        };
      },
    };
  };

  const mockNatsService = {
    getConnection: vi.fn(),
    getStringCodec: vi.fn().mockReturnValue({
      decode: (d: Uint8Array) => Buffer.from(d).toString(),
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        TranscriptionWorker,
        { provide: TranscriptionService, useValue: mockTranscriptionService },
        { provide: NatsService, useValue: mockNatsService },
      ],
    }).compile();

    worker = module.get(TranscriptionWorker);
    transcriptionService = module.get(TranscriptionService);
    natsService = module.get(NatsService);
  });

  describe('onModuleInit', () => {
    it('logs warning and exits gracefully when NATS not connected', async () => {
      mockNatsService.getConnection.mockReturnValue(null);
      await expect(worker.onModuleInit()).resolves.toBeUndefined();
    });

    it('subscribes to media.uploaded when connection is available', async () => {
      const subscription = makeSubscription([]);
      const mockConn = {
        subscribe: vi.fn().mockReturnValue(subscription),
      };
      mockNatsService.getConnection.mockReturnValue(mockConn);

      await worker.onModuleInit();

      expect(mockConn.subscribe).toHaveBeenCalledWith(
        'media.uploaded',
        { queue: 'transcription-workers' }
      );
    });
  });

  describe('message handling', () => {
    it('calls transcribeFile for valid media.uploaded messages', async () => {
      const event = {
        fileKey: 'media/test.mp3',
        assetId: 'asset-1',
        courseId: 'course-1',
        tenantId: 'tenant-1',
        fileName: 'test.mp3',
        contentType: 'audio/mpeg',
      };

      const subscription = makeSubscription([JSON.stringify(event)]);
      const mockConn = { subscribe: vi.fn().mockReturnValue(subscription) };
      mockNatsService.getConnection.mockReturnValue(mockConn);

      await worker.onModuleInit();
      // Allow async message loop to run
      await new Promise((r) => setTimeout(r, 50));

      expect(transcriptionService.transcribeFile).toHaveBeenCalledWith(event);
    });

    it('does not crash on malformed JSON messages', async () => {
      const subscription = makeSubscription(['not-valid-json']);
      const mockConn = { subscribe: vi.fn().mockReturnValue(subscription) };
      mockNatsService.getConnection.mockReturnValue(mockConn);

      await worker.onModuleInit();
      await new Promise((r) => setTimeout(r, 50));

      expect(transcriptionService.transcribeFile).not.toHaveBeenCalled();
    });
  });
});
