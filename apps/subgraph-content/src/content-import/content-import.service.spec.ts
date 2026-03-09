import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ContentImportService } from './content-import.service';
import type { YouTubeClient } from './youtube.client';
import type { FirecrawlClient } from './firecrawl.client';
import type { YouTubePlaylistItem, FirecrawlPage } from './content-import.types';

const makeYoutubeItem = (i: number): YouTubePlaylistItem => ({
  title: `Video ${i}`,
  description: `Desc ${i}`,
  videoId: `vid${i}`,
  thumbnailUrl: null,
  position: i,
  durationSecs: 0,
});

const makeFirecrawlPage = (i: number): FirecrawlPage => ({
  url: `https://example.com/page${i}`,
  markdown: 'x'.repeat(300),
  title: `Page ${i}`,
});

describe('ContentImportService', () => {
  let service: ContentImportService;
  let youtubeClient: { getPlaylistItems: ReturnType<typeof vi.fn> };
  let firecrawlClient: { crawlSite: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    youtubeClient = { getPlaylistItems: vi.fn() };
    firecrawlClient = { crawlSite: vi.fn() };
    service = new ContentImportService(
      youtubeClient as unknown as YouTubeClient,
      firecrawlClient as unknown as FirecrawlClient
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env['YOUTUBE_API_KEY'];
    delete process.env['FIRECRAWL_API_KEY'];
  });

  // ── importFromYoutube ──────────────────────────────────────────────────────

  describe('importFromYoutube', () => {
    it('extracts playlistId from URL and returns ImportJob', async () => {
      process.env['YOUTUBE_API_KEY'] = 'yt-key';
      const items = [makeYoutubeItem(0), makeYoutubeItem(1), makeYoutubeItem(2)];
      youtubeClient.getPlaylistItems.mockResolvedValue(items);

      const result = await service.importFromYoutube(
        {
          playlistUrl: 'https://www.youtube.com/playlist?list=PLabc123',
          courseId: 'c1',
          moduleId: 'm1',
        },
        'tenant-1',
        'user-1'
      );

      expect(youtubeClient.getPlaylistItems).toHaveBeenCalledWith('PLabc123', 'yt-key');
      expect(result.status).toBe('COMPLETE');
      expect(result.lessonCount).toBe(3);
      expect(result.estimatedMinutes).toBe(1);
      expect(result.jobId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('throws BadRequestException when YOUTUBE_API_KEY is missing', async () => {
      delete process.env['YOUTUBE_API_KEY'];
      await expect(
        service.importFromYoutube(
          { playlistUrl: 'https://youtube.com/playlist?list=PLx', courseId: 'c1', moduleId: 'm1' },
          'tenant-1',
          'user-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for invalid playlist URL', async () => {
      process.env['YOUTUBE_API_KEY'] = 'yt-key';
      await expect(
        service.importFromYoutube(
          { playlistUrl: 'https://youtube.com/watch?v=abc', courseId: 'c1', moduleId: 'm1' },
          'tenant-1',
          'user-1'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── importFromWebsite ──────────────────────────────────────────────────────

  describe('importFromWebsite', () => {
    it('returns ImportJob with correct lessonCount', async () => {
      process.env['FIRECRAWL_API_KEY'] = 'fc-key';
      const pages = Array.from({ length: 10 }, (_, i) => makeFirecrawlPage(i));
      firecrawlClient.crawlSite.mockResolvedValue(pages);

      const result = await service.importFromWebsite(
        { siteUrl: 'https://docs.example.com', courseId: 'c1', moduleId: 'm1' },
        'tenant-1',
        'user-1'
      );

      expect(firecrawlClient.crawlSite).toHaveBeenCalledWith(
        'https://docs.example.com',
        100,
        'fc-key'
      );
      expect(result.status).toBe('COMPLETE');
      expect(result.lessonCount).toBe(10);
      expect(result.estimatedMinutes).toBe(2);
    });

    it('throws BadRequestException when FIRECRAWL_API_KEY is missing', async () => {
      delete process.env['FIRECRAWL_API_KEY'];
      await expect(
        service.importFromWebsite(
          { siteUrl: 'https://docs.example.com', courseId: 'c1', moduleId: 'm1' },
          'tenant-1',
          'user-1'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── cancelImport ───────────────────────────────────────────────────────────

  describe('cancelImport', () => {
    it('returns true', () => {
      expect(service.cancelImport('job-123')).toBe(true);
    });
  });
});
