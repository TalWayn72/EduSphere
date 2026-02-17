import { Module } from '@nestjs/common';
import { DiscussionResolver } from './discussion.resolver';
import { DiscussionService } from './discussion.service';

@Module({
  providers: [DiscussionResolver, DiscussionService],
  exports: [DiscussionService],
})
export class DiscussionModule {}
