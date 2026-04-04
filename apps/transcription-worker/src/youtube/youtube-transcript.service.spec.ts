/**
 * P1-11: Unit tests for YouTubeTranscriptService.
 *
 * Tests: URL extraction, transcript fetching with language fallback,
 * segment mapping (ms→seconds), error handling, Zod schema validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock youtube-transcript library ─────────────────────────────────────────
vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: vi.fn(),
  },
}));

import { YoutubeTranscript } from 'youtube-transcript';
import {
  YouTubeTranscriptService,
  extractVideoId,
  YoutubeUrlSchema,
  IngestPayloadSchema,
} from './youtube-transcript.service';

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockFetch = vi.mocked(YoutubeTranscript.fetchTranscript);

function makeRawSegment(text: string, offsetMs: number, durationMs: number) {
  return { text, offset: offsetMs, duration: durationMs, lang: 'he' };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('extractVideoId', () => {
  it('extracts ID from standard watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from short youtu.be URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from embed URL', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from /v/ URL format', () => {
    expect(extractVideoId('https://www.youtube.com/v/dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from shorts URL', () => {
    expect(extractVideoId('https://youtube.com/shorts/dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from URL with additional query params', () => {
    expect(
      extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42')
    ).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube URL', () => {
    expect(extractVideoId('https://vimeo.com/123456')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractVideoId('')).toBeNull();
  });

  it('returns null for malformed YouTube URL with short ID', () => {
    expect(extractVideoId('https://youtube.com/watch?v=abc')).toBeNull();
  });
});

describe('YoutubeUrlSchema', () => {
  it('accepts valid YouTube URL', () => {
    const result = YoutubeUrlSchema.safeParse(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    expect(result.success).toBe(true);
  });

  it('rejects non-YouTube URL', () => {
    const result = YoutubeUrlSchema.safeParse('https://vimeo.com/123');
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = YoutubeUrlSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

describe('IngestPayloadSchema', () => {
  const valid = {
    lessonId: '550e8400-e29b-41d4-a716-446655440000',
    youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
    tenantId: '550e8400-e29b-41d4-a716-446655440001',
    courseId: '550e8400-e29b-41d4-a716-446655440002',
  };

  it('accepts valid payload', () => {
    expect(IngestPayloadSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing lessonId', () => {
    const { lessonId: _, ...rest } = valid;
    expect(IngestPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects non-UUID tenantId', () => {
    expect(
      IngestPayloadSchema.safeParse({ ...valid, tenantId: 'bad' }).success
    ).toBe(false);
  });
});

describe('YouTubeTranscriptService', () => {
  let service: YouTubeTranscriptService;

  beforeEach(() => {
    service = new YouTubeTranscriptService();
    vi.clearAllMocks();
  });

  describe('extractVideoId (instance method)', () => {
    it('returns video ID from valid URL', () => {
      expect(
        service.extractVideoId('https://youtu.be/dQw4w9WgXcQ')
      ).toBe('dQw4w9WgXcQ');
    });

    it('throws for invalid URL', () => {
      expect(() => service.extractVideoId('not-a-url')).toThrow(
        'Invalid YouTube URL'
      );
    });
  });

  describe('fetchTranscript', () => {
    it('returns Hebrew captions when available', async () => {
      mockFetch.mockResolvedValueOnce([
        makeRawSegment('שלום עולם', 0, 3000),
        makeRawSegment('ברוכים הבאים', 3000, 2500),
      ]);

      const result = await service.fetchTranscript('testVideoId');

      expect(result.videoId).toBe('testVideoId');
      expect(result.language).toBe('he');
      expect(result.source).toBe('captions');
      expect(result.segments).toHaveLength(2);
    });

    it('converts offset from milliseconds to seconds', async () => {
      mockFetch.mockResolvedValueOnce([
        makeRawSegment('Hello', 5000, 2000),
      ]);

      const result = await service.fetchTranscript('vid1');

      expect(result.segments[0].startTime).toBe(5);
      expect(result.segments[0].endTime).toBe(7);
    });

    it('falls back to English when Hebrew unavailable', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('No Hebrew'))
        .mockResolvedValueOnce([makeRawSegment('Hello world', 0, 2000)]);

      const result = await service.fetchTranscript('vid2');

      expect(result.language).toBe('en');
      expect(result.segments).toHaveLength(1);
    });

    it('falls back to auto-generated captions when all languages fail', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('No Hebrew'))
        .mockRejectedValueOnce(new Error('No English'))
        .mockResolvedValueOnce([makeRawSegment('Auto text', 0, 1000)]);

      const result = await service.fetchTranscript('vid3');

      expect(result.language).toBe('auto');
      expect(result.segments).toHaveLength(1);
    });

    it('returns empty segments when no captions available at all', async () => {
      mockFetch.mockRejectedValue(new Error('No captions'));

      const result = await service.fetchTranscript('vid4');

      expect(result.segments).toEqual([]);
      expect(result.language).toBe('unknown');
    });

    it('trims whitespace from segment text', async () => {
      mockFetch.mockResolvedValueOnce([
        makeRawSegment('  trimmed text  ', 0, 1000),
      ]);

      const result = await service.fetchTranscript('vid5');

      expect(result.segments[0].text).toBe('trimmed text');
    });

    it('respects custom preferred languages order', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('No Arabic'))
        .mockResolvedValueOnce([makeRawSegment('Bonjour', 0, 1000)]);

      const result = await service.fetchTranscript('vid6', ['ar', 'fr']);

      expect(result.language).toBe('fr');
    });

    it('handles empty segments array from YouTube API', async () => {
      mockFetch
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.fetchTranscript('vid7');

      expect(result.segments).toEqual([]);
      expect(result.language).toBe('unknown');
    });
  });
});
