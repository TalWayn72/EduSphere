import { Module } from '@nestjs/common';
import { AssessmentAggregatorService } from './assessment-aggregator.service.js';
import { AssessmentService } from './assessment.service.js';
import { AssessmentResolver } from './assessment.resolver.js';
import { PeerReviewRubricService } from './peer-review-rubric.service.js';

@Module({
  providers: [
    AssessmentAggregatorService,
    AssessmentService,
    AssessmentResolver,
    PeerReviewRubricService,
  ],
  exports: [AssessmentService, PeerReviewRubricService],
})
export class AssessmentModule {}
