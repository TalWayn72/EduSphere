import { Module } from '@nestjs/common';
import { LiveChatService } from './live-chat.service';
import { LiveChatResolver } from './live-chat.resolver';
import { LiveReactionService } from './live-reaction.service';
import { LiveReactionResolver } from './live-reaction.resolver';
import { LiveQAService } from './live-qa.service';
import { LiveQAResolver } from './live-qa.resolver';
import { LiveBookmarkService } from './live-bookmark.service';
import { LiveBookmarkResolver } from './live-bookmark.resolver';

@Module({
  providers: [
    LiveChatService,
    LiveChatResolver,
    LiveReactionService,
    LiveReactionResolver,
    LiveQAService,
    LiveQAResolver,
    LiveBookmarkService,
    LiveBookmarkResolver,
  ],
  exports: [LiveChatService, LiveQAService, LiveBookmarkService],
})
export class LiveChatModule {}
