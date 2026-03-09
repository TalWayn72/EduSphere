import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TranslationService } from './translation.service';
import { NatsService } from '../nats/nats.service';
import { closeAllPools } from '@edusphere/db';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([
      {
        id: 'seg-1',
        start_time: '0.00',
        end_time: '5.00',
        text: 'Hello world',
      },
    ]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'transcript-123' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }),
  schema: {
    transcripts: {
      asset_id: 'asset_id',
      language: 'language',
      vtt_key: 'vtt_key',
    },
    transcript_segments: { transcript_id: 'transcript_id' },
  },
  eq: vi.fn((_col: unknown, val: unknown) => val),
  and: vi.fn((...args: unknown[]) => args),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function () {
    return { send: vi.fn().mockResolvedValue({}) };
  }),
  PutObjectCommand: vi.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TranslationService', () => {
  let service: TranslationService;
  let mockNatsPublish: ReturnType<typeof vi.fn>;

  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      TRANSLATION_TARGETS: 'he,fr',
      LIBRE_TRANSLATE_URL: 'http://libretranslate.local',
    };
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);

    mockNatsPublish = vi.fn().mockResolvedValue(undefined);

    const module = await Test.createTestingModule({
      providers: [
        TranslationService,
        { provide: NatsService, useValue: { publish: mockNatsPublish } },
      ],
    }).compile();

    service = module.get<TranslationService>(TranslationService);
  });

  afterEach(() => {
    process.env = OLD_ENV;
    vi.clearAllMocks();
  });

  describe('onModuleDestroy', () => {
    it('closes all database pools on destroy', async () => {
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalledTimes(1);
    });
  });

  describe('translateTranscript', () => {
    it('returns early when TRANSLATION_TARGETS is empty', async () => {
      process.env.TRANSLATION_TARGETS = '';
      await service.translateTranscript('t1', 'a1', 'c1', 'tenant1', 'en');
      expect(mockNatsPublish).not.toHaveBeenCalled();
    });

    it('returns early when TRANSLATION_TARGETS is undefined', async () => {
      delete process.env.TRANSLATION_TARGETS;
      await service.translateTranscript('t1', 'a1', 'c1', 'tenant1', 'en');
      expect(mockNatsPublish).not.toHaveBeenCalled();
    });

    it('skips target language that matches source language', async () => {
      process.env.TRANSLATION_TARGETS = 'en,he';
      // Spy on translateText to intercept the actual translation calls
      const translateSpy = vi
        .spyOn(service, 'translateText')
        .mockResolvedValue('mocked translation');
      await service.translateTranscript('t1', 'a1', 'c1', 'tenant1', 'en');
      // translateText should only be called for 'he', not 'en' (source == target)
      const calledTargets = translateSpy.mock.calls.map((c) => c[2]);
      expect(calledTargets).not.toContain('en');
    });

    it('processes all target languages from env', async () => {
      process.env.TRANSLATION_TARGETS = 'he,fr';
      vi.spyOn(service, 'translateText').mockResolvedValue('mocked');
      // Just verify it doesn't throw when two targets are configured
      await expect(
        service.translateTranscript('t1', 'a1', 'c1', 'tenant1', 'en')
      ).resolves.toBeUndefined();
    });
  });

  describe('translateText (graceful degradation)', () => {
    it('returns original text on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const result = await (
        service as never as {
          translateText: (
            text: string,
            source: string,
            target: string
          ) => Promise<string>;
        }
      ).translateText('Hello', 'en', 'he');
      expect(result).toBe('Hello');
    });

    it('returns original text on HTTP error response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Server error' }),
      } as unknown as Response);
      const result = await (
        service as never as {
          translateText: (
            text: string,
            source: string,
            target: string
          ) => Promise<string>;
        }
      ).translateText('Hello', 'en', 'he');
      expect(result).toBe('Hello');
    });

    it('returns translated text on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ translatedText: 'שלום' }),
      } as unknown as Response);
      const result = await (
        service as never as {
          translateText: (
            text: string,
            source: string,
            target: string
          ) => Promise<string>;
        }
      ).translateText('Hello', 'en', 'he');
      expect(result).toBe('שלום');
    });
  });

  describe('translateText', () => {
    it('is a public method on the service', () => {
      expect(typeof service.translateText).toBe('function');
    });
  });
});
