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

@Injectable()
export class YouTubeClient {
  private readonly logger = new Logger(YouTubeClient.name);

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
          s.resourceId?.videoId ??
          item.contentDetails?.videoId ??
          '';
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
