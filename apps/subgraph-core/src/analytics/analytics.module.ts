import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OrgAnalyticsService } from './org-analytics.service';
import { AtRiskLearnerService } from './at-risk-learner.service';
import { AnalyticsSnapshotCron } from './analytics-snapshot.cron';
import { AnalyticsExportController } from './analytics-export.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AnalyticsExportController],
  providers: [
    OrgAnalyticsService,
    AtRiskLearnerService,
    AnalyticsSnapshotCron,
  ],
  exports: [
    OrgAnalyticsService,
    AtRiskLearnerService,
  ],
})
export class OrgAnalyticsModule {}
