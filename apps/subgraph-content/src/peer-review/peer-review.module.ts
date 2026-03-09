import { Module } from '@nestjs/common';
import { PeerReviewService } from './peer-review.service.js';
import { PeerReviewResolver } from './peer-review.resolver.js';

@Module({
  providers: [PeerReviewService, PeerReviewResolver],
  exports: [PeerReviewService],
})
export class PeerReviewModule {}
