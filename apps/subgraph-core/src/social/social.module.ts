import { Module } from '@nestjs/common';
import { SocialFollowService } from './social-follow.service';
import { SocialFeedService } from './social-feed.service';
import { SocialService } from './social.service';
import { SocialResolver } from './social.resolver';

@Module({
  providers: [
    SocialFollowService,
    SocialFeedService,
    SocialService,
    SocialResolver,
  ],
  exports: [SocialService],
})
export class SocialModule {}
