import { Module } from '@nestjs/common';
import { AnalyticsResolver } from './analytics.resolver.js';
import { AnalyticsService } from './analytics.service.js';

@Module({
  providers: [AnalyticsResolver, AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
