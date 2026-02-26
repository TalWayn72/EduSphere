import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TranscriptionWorker } from './transcription.worker';

describe('TranscriptionWorker', () => {
  const mockTranscriptionService = {
    transcribeFile: vi.fn().mockResolvedValue(undefined),
  };

  // Minimal async-iterable subscription mock
  const makeSubscription = (messages: string[]) => {
    let index = 0;
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

  let worker: TranscriptionWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    // Skip the 500ms startup delay in every test
    vi.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      (fn as () => void)();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
    worker = new TranscriptionWorker(
      mockTranscriptionService as any,
      mockNatsService as any
    );
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

      expect(mockConn.subscribe).toHaveBeenCalledWith('media.uploaded', {
        queue: 'transcription-workers',
      });
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

      expect(mockTranscriptionService.transcribeFile).toHaveBeenCalledWith(
        event
      );
    });

    it('does not crash on malformed JSON messages', async () => {
      const subscription = makeSubscription(['not-valid-json']);
      const mockConn = { subscribe: vi.fn().mockReturnValue(subscription) };
      mockNatsService.getConnection.mockReturnValue(mockConn);

      await worker.onModuleInit();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockTranscriptionService.transcribeFile).not.toHaveBeenCalled();
    });
  });
});
