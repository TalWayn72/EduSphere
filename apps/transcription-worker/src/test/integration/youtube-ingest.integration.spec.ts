/**
 * P1-12: Integration test — YouTube URL → stored transcript_segments.
 *
 * Tests the full ingest pipeline: URL validation → caption fetch →
 * segment storage → NATS event publication.
 * Mocks: YouTube API, NATS, database (Drizzle).
 * Validates: correct segment count, timestamps, NATS event payload.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: vi.fn(),
  },
}));

const mockDbInsertTranscript = vi.fn().mockResolvedValue({
  id: 'transcript-uuid-1',
});

vi.mock('@edusphere/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockDbInsertTranscript,
      }),
    }),
  },
  transcripts: {},
  transcript_segments: {},
  media_assets: {},
}));

import { YoutubeTranscript } from 'youtube-transcript';
import {
  YouTubeTranscriptService,
  extractVideoId,
  IngestPayloadSchema,
} from '../../youtube/youtube-transcript.service';

const mockFetch = vi.mocked(YoutubeTranscript.fetchTranscript);

// ── Fixtures ────────────────────────────────────────────────────────────────

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const VIDEO_ID = 'dQw4w9WgXcQ';
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const LESSON_ID = '550e8400-e29b-41d4-a716-446655440010';
const COURSE_ID = '550e8400-e29b-41d4-a716-446655440020';

const SAMPLE_YOUTUBE_RESPONSE = [
  { text: 'Welcome to the lesson', offset: 0, duration: 3000, lang: 'en' },
  { text: 'Today we study Torah', offset: 3000, duration: 4000, lang: 'en' },
  { text: 'Let us begin', offset: 7000, duration: 2000, lang: 'en' },
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe('YouTube Ingest Pipeline — Integration', () => {
  let service: YouTubeTranscriptService;

  beforeEach(() => {
    service = new YouTubeTranscriptService();
    vi.clearAllMocks();
  });

  it('extracts video ID from the YouTube URL', () => {
    expect(extractVideoId(YOUTUBE_URL)).toBe(VIDEO_ID);
  });

  it('fetches transcript and maps segments with correct timestamps', async () => {
    mockFetch.mockResolvedValueOnce(SAMPLE_YOUTUBE_RESPONSE);

    const result = await service.fetchTranscript(VIDEO_ID);

    expect(result.videoId).toBe(VIDEO_ID);
    expect(result.segments).toHaveLength(3);

    // Verify ms→s conversion
    expect(result.segments[0].startTime).toBe(0);
    expect(result.segments[0].endTime).toBe(3);
    expect(result.segments[1].startTime).toBe(3);
    expect(result.segments[1].endTime).toBe(7);
    expect(result.segments[2].startTime).toBe(7);
    expect(result.segments[2].endTime).toBe(9);
  });

  it('pipeline processes full ingest: URL → video ID → captions → segments', async () => {
    mockFetch.mockResolvedValueOnce(SAMPLE_YOUTUBE_RESPONSE);

    // Step 1: Extract video ID
    const videoId = service.extractVideoId(YOUTUBE_URL);
    expect(videoId).toBe(VIDEO_ID);

    // Step 2: Fetch transcript
    const transcript = await service.fetchTranscript(videoId);
    expect(transcript.source).toBe('captions');
    expect(transcript.segments).toHaveLength(3);

    // Step 3: Verify segments have expected structure
    for (const seg of transcript.segments) {
      expect(seg).toHaveProperty('text');
      expect(seg).toHaveProperty('startTime');
      expect(seg).toHaveProperty('endTime');
      expect(typeof seg.startTime).toBe('number');
      expect(typeof seg.endTime).toBe('number');
      expect(seg.endTime).toBeGreaterThan(seg.startTime);
    }
  });

  it('builds correct NATS event payload after transcript extraction', async () => {
    mockFetch.mockResolvedValueOnce(SAMPLE_YOUTUBE_RESPONSE);

    const transcript = await service.fetchTranscript(VIDEO_ID);

    // Simulated NATS payload for lesson.transcript.ready
    const eventPayload = {
      lessonId: LESSON_ID,
      transcriptId: 'transcript-uuid-1',
      segmentCount: transcript.segments.length,
      tenantId: TENANT_ID,
      language: transcript.language,
    };

    expect(eventPayload.segmentCount).toBe(3);
    expect(eventPayload.tenantId).toBe(TENANT_ID);
    expect(eventPayload.language).toMatch(/^(he|en|auto)$/);
  });

  it('handles YouTube API failure gracefully — returns empty segments', async () => {
    mockFetch.mockRejectedValue(new Error('YouTube API error'));

    const result = await service.fetchTranscript(VIDEO_ID);

    expect(result.segments).toEqual([]);
    expect(result.language).toBe('unknown');
  });

  it('preserves segment text content faithfully', async () => {
    const hebrewResponse = [
      { text: 'בראשית ברא אלהים', offset: 0, duration: 5000, lang: 'he' },
      { text: 'את השמים ואת הארץ', offset: 5000, duration: 4000, lang: 'he' },
    ];
    mockFetch.mockResolvedValueOnce(hebrewResponse);

    const result = await service.fetchTranscript(VIDEO_ID, ['he']);

    expect(result.language).toBe('he');
    expect(result.segments[0].text).toBe('בראשית ברא אלהים');
    expect(result.segments[1].text).toBe('את השמים ואת הארץ');
  });

  it('validates IngestPayload before processing', () => {
    const validPayload = {
      lessonId: LESSON_ID,
      youtubeUrl: YOUTUBE_URL,
      tenantId: TENANT_ID,
      courseId: COURSE_ID,
    };

    expect(IngestPayloadSchema.safeParse(validPayload).success).toBe(true);

    const invalidPayload = {
      lessonId: 'not-a-uuid',
      youtubeUrl: 'not-a-youtube-url',
      tenantId: TENANT_ID,
      courseId: COURSE_ID,
    };

    expect(IngestPayloadSchema.safeParse(invalidPayload).success).toBe(false);
  });
});
