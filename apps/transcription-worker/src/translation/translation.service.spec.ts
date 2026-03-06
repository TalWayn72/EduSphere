import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { NatsService } from '../nats/nats.service';
import { closeAllPools } from '@edusphere/db';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNatsPublish = jest.fn().mockResolvedValue(undefined);
jest.mock('../nats/nats.service', () => ({
  NatsService: jest.fn().mockImplementation(() => ({
    publish: mockNatsPublish,
  })),
}));

jest.mock('@edusphere/db', () => ({
  createDatabaseConnection: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([
      {
        id: 'seg-1',
        start_time: '0.00',
        end_time: '5.00',
        text: 'Hello world',
      },
    ]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 'transcript-123' }]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  }),
  schema: {
    transcripts: {
      asset_id: 'asset_id',
      language: 'language',
      vtt_key: 'vtt_key',
    },
    transcript_segments: { transcript_id: 'transcript_id' },
  },
  eq: jest.fn((_col: unknown, val: unknown) => val),
  and: jest.fn((...args: unknown[]) => args),
  closeAllPools: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TranslationService', () => {
  let service: TranslationService;

  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      TRANSLATION_TARGETS: 'he,fr',
      LIBRE_TRANSLATE_URL: 'http://libretranslate.local',
    };
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);

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
    jest.clearAllMocks();
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
      // Source language = 'en', so only 'he' should be attempted
      const translateSpy = jest
        .spyOn(service as never, 'translateToLanguage')
        .mockResolvedValue(undefined);
      await service.translateTranscript('t1', 'a1', 'c1', 'tenant1', 'en');
      expect(translateSpy).toHaveBeenCalledWith(
        expect.anything(),
        'a1',
        'c1',
        'tenant1',
        'he',
        'en'
      );
      expect(translateSpy).not.toHaveBeenCalledWith(
        expect.anything(),
        'a1',
        'c1',
        'tenant1',
        'en',
        'en'
      );
    });

    it('processes all target languages from env', async () => {
      process.env.TRANSLATION_TARGETS = 'he,fr';
      const translateSpy = jest
        .spyOn(service as never, 'translateToLanguage')
        .mockResolvedValue(undefined);
      await service.translateTranscript('t1', 'a1', 'c1', 'tenant1', 'en');
      expect(translateSpy).toHaveBeenCalledTimes(2);
      const calledLangs = translateSpy.mock.calls.map((c: unknown[]) => c[4]);
      expect(calledLangs).toContain('he');
      expect(calledLangs).toContain('fr');
    });
  });

  describe('translateText (graceful degradation)', () => {
    it('returns original text on fetch failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
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
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Server error' }),
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
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ translatedText: 'שלום' }),
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

  describe('generateVtt', () => {
    it('generates valid WebVTT format', () => {
      const segments = [
        { start_time: '0.00', end_time: '5.00', text: 'Hello world' },
        { start_time: '5.50', end_time: '10.00', text: 'Second segment' },
      ];
      const vtt = (
        service as never as {
          generateVtt: (segments: typeof segments) => string;
        }
      ).generateVtt(segments);
      expect(vtt).toMatch(/^WEBVTT/);
      expect(vtt).toContain('Hello world');
      expect(vtt).toContain('Second segment');
      expect(vtt).toMatch(
        /\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/
      );
    });
  });
});
