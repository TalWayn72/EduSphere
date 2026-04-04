/**
 * YouTubeTranscriptService — extracts captions from YouTube videos.
 *
 * Uses the `youtube-transcript` library to fetch available captions.
 * Falls back to Whisper STT when no captions are available.
 */
import { Injectable, Logger } from '@nestjs/common';
import { YoutubeTranscript } from 'youtube-transcript';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  readonly text: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly language?: string;
}

export interface YouTubeTranscriptResult {
  readonly videoId: string;
  readonly segments: TranscriptSegment[];
  readonly language: string;
  readonly source: 'captions' | 'whisper';
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const YoutubeUrlSchema = z
  .string()
  .min(1)
  .refine((url) => extractVideoId(url) !== null, {
    message: 'Invalid YouTube URL',
  });

export const IngestPayloadSchema = z.object({
  lessonId: z.string().uuid(),
  youtubeUrl: YoutubeUrlSchema,
  tenantId: z.string().uuid(),
  courseId: z.string().uuid(),
});

export type IngestPayload = z.infer<typeof IngestPayloadSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts a YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://youtube.com/shorts/VIDEO_ID
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class YouTubeTranscriptService {
  private readonly logger = new Logger(YouTubeTranscriptService.name);

  /**
   * Fetches transcript segments from YouTube captions API.
   * Tries Hebrew first, then English, then any available language.
   */
  async fetchTranscript(
    videoId: string,
    preferredLanguages: string[] = ['he', 'en']
  ): Promise<YouTubeTranscriptResult> {
    this.logger.log({ videoId }, 'Fetching YouTube transcript');

    for (const lang of preferredLanguages) {
      try {
        const segments = await this.fetchWithLanguage(videoId, lang);
        if (segments.length > 0) {
          this.logger.log(
            { videoId, lang, segmentCount: segments.length },
            'Fetched captions successfully'
          );
          return { videoId, segments, language: lang, source: 'captions' };
        }
      } catch {
        this.logger.debug({ videoId, lang }, 'No captions for language');
      }
    }

    // Try without language filter (auto-generated captions)
    try {
      const segments = await this.fetchWithLanguage(videoId);
      if (segments.length > 0) {
        this.logger.log(
          { videoId, segmentCount: segments.length },
          'Fetched auto-generated captions'
        );
        return { videoId, segments, language: 'auto', source: 'captions' };
      }
    } catch {
      this.logger.debug({ videoId }, 'No auto-generated captions');
    }

    this.logger.warn(
      { videoId },
      'No captions available — caller should fall back to Whisper'
    );
    return { videoId, segments: [], language: 'unknown', source: 'captions' };
  }

  /**
   * Validates and extracts a video ID from a YouTube URL.
   */
  extractVideoId(url: string): string {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error(`Invalid YouTube URL: ${url}`);
    }
    return videoId;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async fetchWithLanguage(
    videoId: string,
    lang?: string
  ): Promise<TranscriptSegment[]> {
    const config = lang ? { lang } : undefined;
    const items = await YoutubeTranscript.fetchTranscript(videoId, config);

    return items.map((item) => ({
      text: item.text.trim(),
      startTime: item.offset / 1000, // Convert ms → seconds
      endTime: (item.offset + item.duration) / 1000,
      language: lang,
    }));
  }
}
