import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import type { YouTubePlaylistItem } from './content-import.types';

interface YTSnippet {
  title: string;
  description: string;
  position: number;
  thumbnails?: { default?: { url?: string } };
  resourceId?: { videoId?: string };
}

interface YTItem {
  snippet: YTSnippet;
  contentDetails?: { videoId?: string };
}

interface YTResponse {
  items?: YTItem[];
  nextPageToken?: string;
}

/** Regex matching a raw 11-character YouTube video ID. */
const RAW_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Patterns that capture a video ID from common YouTube URL formats:
 * watch, youtu.be, embed, v/, shorts, live.
 */
const VIDEO_ID_PATTERNS: RegExp[] = [
  /[?&]v=([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /\/embed\/([a-zA-Z0-9_-]{11})/,
  /\/v\/([a-zA-Z0-9_-]{11})/,
  /\/shorts\/([a-zA-Z0-9_-]{11})/,
  /\/live\/([a-zA-Z0-9_-]{11})/,
];

@Injectable()
export class YouTubeClient {
  private readonly logger = new Logger(YouTubeClient.name);

  /**
   * Extract a YouTube video ID from any common URL format or a raw 11-char ID.
   *
   * Supported formats:
   * - https://www.youtube.com/watch?v=ID
   * - https://youtu.be/ID
   * - https://www.youtube.com/embed/ID
   * - https://www.youtube.com/v/ID
   * - https://www.youtube.com/shorts/ID
   * - https://www.youtube.com/live/ID
   * - https://m.youtube.com/watch?v=ID
   * - Raw 11-character video ID string
   */
  static extractVideoId(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) {
      throw new BadRequestException('Invalid YouTube URL or video ID');
    }

    // Check for raw video ID (exactly 11 valid chars)
    if (RAW_VIDEO_ID_RE.test(trimmed)) {
      return trimmed;
    }

    // Try each URL pattern
    for (const pattern of VIDEO_ID_PATTERNS) {
      const match = pattern.exec(trimmed);
      if (match?.[1]) {
        return match[1];
      }
    }

    throw new BadRequestException('Invalid YouTube URL or video ID');
  }

  async getPlaylistItems(
    playlistId: string,
    apiKey: string
  ): Promise<YouTubePlaylistItem[]> {
    const results: YouTubePlaylistItem[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(
        'https://www.googleapis.com/youtube/v3/playlistItems'
      );
      url.searchParams.set('part', 'snippet,contentDetails');
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('playlistId', playlistId);
      url.searchParams.set('key', apiKey);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString());

      if (res.status === 403) {
        throw new BadRequestException('YouTube API quota exceeded');
      }
      if (res.status === 404) {
        throw new BadRequestException('Playlist not found');
      }
      if (!res.ok) {
        throw new BadRequestException(`YouTube API error: ${res.status}`);
      }

      const data = (await res.json()) as YTResponse;
      for (const item of data.items ?? []) {
        const s = item.snippet;
        const videoId =
          s.resourceId?.videoId ?? item.contentDetails?.videoId ?? '';
        results.push({
          title: s.title,
          description: s.description,
          videoId,
          thumbnailUrl: s.thumbnails?.default?.url ?? null,
          position: s.position,
          durationSecs: 0,
        });
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    this.logger.log(
      `Fetched ${results.length} items from playlist ${playlistId}`
    );
    return results;
  }
}
