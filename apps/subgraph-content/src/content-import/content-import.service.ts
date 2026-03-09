import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { YouTubeClient } from './youtube.client';
import { FirecrawlClient } from './firecrawl.client';
import { GoogleDriveClient } from './google-drive.client';
import type { ImportJobResult } from './content-import.types';

interface YoutubeImportInput {
  playlistUrl: string;
  courseId: string;
  moduleId: string;
}

interface WebsiteImportInput {
  siteUrl: string;
  courseId: string;
  moduleId: string;
}

interface DriveImportInput {
  folderId: string;
  courseId: string;
  moduleId: string;
  accessToken: string;
}

@Injectable()
export class ContentImportService implements OnModuleDestroy {
  private readonly logger = new Logger(ContentImportService.name);

  constructor(
    private readonly youtubeClient: YouTubeClient,
    private readonly firecrawlClient: FirecrawlClient,
    private readonly driveClient: GoogleDriveClient
  ) {}

  async importFromYoutube(
    input: YoutubeImportInput,
    tenantId: string,
    userId: string
  ): Promise<ImportJobResult> {
    const apiKey = process.env['YOUTUBE_API_KEY'];
    if (!apiKey) throw new BadRequestException('YOUTUBE_API_KEY is not configured');

    const match = /[?&]list=([A-Za-z0-9_-]+)/.exec(input.playlistUrl);
    if (!match?.[1]) {
      throw new BadRequestException('Invalid YouTube playlist URL');
    }
    const playlistId = match[1];

    this.logger.log(
      { tenantId, userId, playlistId, courseId: input.courseId },
      'Starting YouTube import'
    );

    const items = await this.youtubeClient.getPlaylistItems(playlistId, apiKey);

    return {
      jobId: randomUUID(),
      status: 'COMPLETE',
      lessonCount: items.length,
      estimatedMinutes: Math.ceil(items.length / 10),
    };
  }

  async importFromWebsite(
    input: WebsiteImportInput,
    tenantId: string,
    userId: string
  ): Promise<ImportJobResult> {
    const apiKey = process.env['FIRECRAWL_API_KEY'];
    if (!apiKey) throw new BadRequestException('FIRECRAWL_API_KEY is not configured');

    this.logger.log(
      { tenantId, userId, siteUrl: input.siteUrl, courseId: input.courseId },
      'Starting website import'
    );

    const pages = await this.firecrawlClient.crawlSite(input.siteUrl, 100, apiKey);

    return {
      jobId: randomUUID(),
      status: 'COMPLETE',
      lessonCount: pages.length,
      estimatedMinutes: Math.ceil(pages.length / 5),
    };
  }

  async importFromDrive(
    input: DriveImportInput,
    tenantId: string,
    userId: string,
  ): Promise<{ id: string; status: string; lessonCount: number; estimatedMinutes: number | null }> {
    const jobId = `drive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.logger.log({ jobId, folderId: input.folderId, tenantId, userId }, 'Starting Google Drive import');

    // Fire-and-forget with timeout (Memory Safety Rule)
    const task = this.driveClient.listFolderContents(input.folderId, input.accessToken).then(async (files) => {
      this.logger.log({ jobId, fileCount: files.length }, 'Drive import: files listed');
      // TODO: enqueue files through ContentIngestionPipelineService for full processing
    });

    void Promise.race([
      task,
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Drive import timeout')), 5 * 60 * 1000)),
    ]).catch((err: unknown) => {
      this.logger.error({ jobId, err }, 'Drive import failed or timed out');
    });

    return { id: jobId, status: 'PENDING', lessonCount: 0, estimatedMinutes: 5 };
  }

  cancelImport(_jobId: string): boolean {
    this.logger.log({ jobId: _jobId }, 'cancelImport called (stub)');
    return true;
  }

  onModuleDestroy(): void {
    this.logger.log('ContentImportService destroyed');
  }
}
