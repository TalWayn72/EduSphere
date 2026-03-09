import { Module } from '@nestjs/common';
import { ContentImportService } from './content-import.service';
import { YouTubeClient } from './youtube.client';
import { FirecrawlClient } from './firecrawl.client';
import { GoogleDriveClient } from './google-drive.client';
import { ContentImportResolver } from './content-import.resolver';

@Module({
  providers: [ContentImportService, YouTubeClient, FirecrawlClient, GoogleDriveClient, ContentImportResolver],
  exports: [ContentImportService],
})
export class ContentImportModule {}
