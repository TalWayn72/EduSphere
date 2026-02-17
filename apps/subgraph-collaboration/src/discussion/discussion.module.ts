import { Module } from '@nestjs/common';
import {
  DiscussionResolver,
  DiscussionMessageResolver,
  DiscussionParticipantResolver
} from './discussion.resolver';
import { DiscussionService } from './discussion.service';

@Module({
  providers: [
    DiscussionResolver,
    DiscussionMessageResolver,
    DiscussionParticipantResolver,
    DiscussionService
  ],
  exports: [DiscussionService],
})
export class DiscussionModule {}
