import { Module } from '@nestjs/common';
import {
  DiscussionResolver,
  DiscussionMessageResolver,
  DiscussionParticipantResolver,
} from './discussion.resolver';
import { DiscussionService } from './discussion.service';
import { DiscussionInsightsService } from './discussion-insights.service';

@Module({
  providers: [
    DiscussionResolver,
    DiscussionMessageResolver,
    DiscussionParticipantResolver,
    DiscussionService,
    DiscussionInsightsService,
  ],
  exports: [DiscussionService, DiscussionInsightsService],
})
export class DiscussionModule {}
