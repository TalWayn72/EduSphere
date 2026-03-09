import { Module } from '@nestjs/common';
import { ContentImportService } from './content-import.service';
import { YouTubeClient } from './youtube.client';
import { FirecrawlClient } from './firecrawl.client';
import { ContentImportResolver } from './content-import.resolver';

@Module({
  providers: [ContentImportService, YouTubeClient, FirecrawlClient, ContentImportResolver],
  exports: [ContentImportService],
})
export class ContentImportModule {}
