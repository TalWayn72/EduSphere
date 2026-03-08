import { Module } from '@nestjs/common';
import { AnalyticsResolver } from './analytics.resolver.js';
import { AnalyticsService } from './analytics.service.js';
import { TenantAnalyticsService } from './tenant-analytics.service.js';
import { TenantAnalyticsExportService } from './tenant-analytics-export.service.js';
import { TenantAnalyticsResolver } from './tenant-analytics.resolver.js';
import { AnalyticsSnapshotJob } from './analytics-snapshot.job.js';

@Module({
  providers: [
    AnalyticsResolver,
    AnalyticsService,
    TenantAnalyticsService,
    TenantAnalyticsExportService,
    TenantAnalyticsResolver,
    AnalyticsSnapshotJob,
  ],
  exports: [AnalyticsService, TenantAnalyticsService],
})
export class AnalyticsModule {}
