import { Module } from '@nestjs/common';
import { ContentImportService } from './content-import.service';
import { YouTubeClient } from './youtube.client';
import { FirecrawlClient } from './firecrawl.client';
import { GoogleDriveClient } from './google-drive.client';
import { ContentImportResolver } from './content-import.resolver';
import { ScormExportService } from './scorm-export.service';

@Module({
  providers: [ContentImportService, YouTubeClient, FirecrawlClient, GoogleDriveClient, ContentImportResolver, ScormExportService],
  exports: [ContentImportService, ScormExportService],
})
export class ContentImportModule {}
