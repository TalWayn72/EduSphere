import { Module } from '@nestjs/common';
import { DiscussionResolver } from './discussion.resolver';
import {
  DiscussionMessageResolver,
  DiscussionParticipantResolver,
} from './discussion-field.resolver';
import { DiscussionThreadService } from './discussion-thread.service';
import { DiscussionMessageService } from './discussion-message.service';
import { DiscussionService } from './discussion.service';
import { DiscussionInsightsService } from './discussion-insights.service';

@Module({
  providers: [
    DiscussionThreadService,
    DiscussionMessageService,
    DiscussionResolver,
    DiscussionMessageResolver,
    DiscussionParticipantResolver,
    DiscussionService,
    DiscussionInsightsService,
  ],
  exports: [DiscussionService, DiscussionInsightsService],
})
export class DiscussionModule {}
