import { Module } from '@nestjs/common';
import { PeerReviewCoreService } from './peer-review-core.service.js';
import { PeerReviewAssignmentService } from './peer-review-assignment.service.js';
import { PeerReviewService } from './peer-review.service.js';
import { PeerReviewResolver } from './peer-review.resolver.js';

@Module({
  providers: [
    PeerReviewCoreService,
    PeerReviewAssignmentService,
    PeerReviewService,
    PeerReviewResolver,
  ],
  exports: [PeerReviewService],
})
export class PeerReviewModule {}
