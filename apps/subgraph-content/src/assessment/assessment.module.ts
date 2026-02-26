import { Module } from '@nestjs/common';
import { AssessmentAggregatorService } from './assessment-aggregator.service.js';
import { AssessmentService } from './assessment.service.js';
import { AssessmentResolver } from './assessment.resolver.js';

@Module({
  providers: [
    AssessmentAggregatorService,
    AssessmentService,
    AssessmentResolver,
  ],
  exports: [AssessmentService],
})
export class AssessmentModule {}
