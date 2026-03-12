/**
 * HrisModule — NestJS module for HRIS integration + nightly sync cron.
 */
import { Module } from '@nestjs/common';
import { ScimAdapter } from './scim.adapter.js';
import { WorkdayAdapter } from './workday.adapter.js';
import { SapAdapter } from './sap.adapter.js';
import { BannerAdapter } from './banner.adapter.js';
import { HrisIntegrationService } from './hris-integration.service.js';
import { HrisSyncCron } from './hris-sync.cron.js';

@Module({
  providers: [
    ScimAdapter,
    WorkdayAdapter,
    SapAdapter,
    BannerAdapter,
    HrisIntegrationService,
    HrisSyncCron,
  ],
  exports: [HrisIntegrationService],
})
export class HrisModule {}
