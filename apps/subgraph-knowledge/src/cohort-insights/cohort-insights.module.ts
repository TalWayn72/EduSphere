import { Module } from '@nestjs/common';
import { CohortInsightsService } from './cohort-insights.service.js';
import { CohortInsightsResolver } from './cohort-insights.resolver.js';

@Module({
  providers: [CohortInsightsService, CohortInsightsResolver],
})
export class CohortInsightsModule {}
