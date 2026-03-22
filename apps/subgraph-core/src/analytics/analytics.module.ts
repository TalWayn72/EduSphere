import { Module } from '@nestjs/common';
import { OrgAnalyticsService } from './org-analytics.service';

@Module({
  providers: [OrgAnalyticsService],
  exports: [OrgAnalyticsService],
})
export class OrgAnalyticsModule {}
