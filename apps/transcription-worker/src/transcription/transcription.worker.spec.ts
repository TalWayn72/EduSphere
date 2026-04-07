import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TranscriptionWorker } from './transcription.worker';
// BUG-123 reproducer: import SUBJECT constant indirectly via the module
// The publisher (content subgraph) sends to 'EDUSPHERE.media.uploaded'.
// This test verifies the worker subscribes to the same subject.
const EXPECTED_SUBJECT = 'EDUSPHERE.media.uploaded';
const EXPECTED_STREAM_PATTERN = 'EDUSPHERE.media.>';

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
    /* eslint-disable @typescript-eslint/no-explicit-any -- partial mocks in test */
    worker = new TranscriptionWorker(
      mockTranscriptionService as any,
      mockNatsService as any
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });

  describe('onModuleInit', () => {
    it('logs warning and exits gracefully when NATS not connected', async () => {
      mockNatsService.getConnection.mockReturnValue(null);
      await expect(worker.onModuleInit()).resolves.toBeUndefined();
    });

    it('subscribes to EDUSPHERE.media.uploaded when connection is available', async () => {
      const subscription = makeSubscription([]);
      const mockConn = {
        subscribe: vi.fn().mockReturnValue(subscription),
      };
      mockNatsService.getConnection.mockReturnValue(mockConn);

      await worker.onModuleInit();

      // BUG-123 fix: must match publisher subject 'EDUSPHERE.media.uploaded'
      expect(mockConn.subscribe).toHaveBeenCalledWith(
        'EDUSPHERE.media.uploaded',
        {
          queue: 'transcription-workers',
        }
      );
    });

    // BUG-123 reproducer: worker MUST subscribe to EDUSPHERE.media.uploaded,
    // not the bare 'media.uploaded'. Publisher (content subgraph line 316)
    // sends to 'EDUSPHERE.media.uploaded'. These tests prove the mismatch
    // before the fix and verify correct behaviour after.
    it('BUG-123: subscribes to EDUSPHERE.media.uploaded (matches publisher subject)', async () => {
      const subscription = makeSubscription([]);
      const mockConn = {
        subscribe: vi.fn().mockReturnValue(subscription),
      };
      mockNatsService.getConnection.mockReturnValue(mockConn);

      await worker.onModuleInit();

      expect(mockConn.subscribe).toHaveBeenCalledWith(EXPECTED_SUBJECT, {
        queue: 'transcription-workers',
      });
    });
  });

  describe('BUG-123: subject/stream constant validation', () => {
    it('SUBJECT constant must equal EDUSPHERE.media.uploaded', () => {
      // This test inspects the subscription call to verify the constant value.
      // It will FAIL before the fix (wrong subject) and PASS after.
      const subscription = makeSubscription([]);
      const mockConn = {
        subscribe: vi.fn().mockReturnValue(subscription),
      };
      mockNatsService.getConnection.mockReturnValue(mockConn);

      // Run synchronously to capture subscribe call args
      const initPromise = worker.onModuleInit();
      return initPromise.then(() => {
        const calledWith = mockConn.subscribe.mock.calls[0]?.[0] as string;
        expect(calledWith).toBe(EXPECTED_SUBJECT);
        expect(calledWith).toMatch(/^EDUSPHERE\./);
      });
    });

    it('EXPECTED_STREAM_PATTERN covers EDUSPHERE.media.uploaded', () => {
      // Verifies that 'EDUSPHERE.media.>' would match 'EDUSPHERE.media.uploaded'
      // using NATS wildcard semantics (> matches one or more tokens)
      const subject = EXPECTED_SUBJECT; // 'EDUSPHERE.media.uploaded'
      const patternPrefix = EXPECTED_STREAM_PATTERN.replace('.>', '');
      expect(subject.startsWith(patternPrefix)).toBe(true);
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
