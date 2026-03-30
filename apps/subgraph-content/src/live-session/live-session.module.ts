import { Module } from '@nestjs/common';
import { LiveSessionResolver } from './live-session.resolver';
import { LiveSessionService } from './live-session.service';
import { LiveSessionRecordingService } from './live-session-recording.service';
import { BreakoutService } from './breakout.service';
import { PollService } from './poll.service';
import { PollVoteService } from './poll-vote.service';
import { LiveSessionExtensionsResolver } from './live-session-extensions.resolver';

@Module({
  providers: [
    LiveSessionResolver,
    LiveSessionRecordingService,
    LiveSessionService,
    BreakoutService,
    PollService,
    PollVoteService,
    LiveSessionExtensionsResolver,
  ],
  exports: [LiveSessionService, LiveSessionRecordingService, BreakoutService, PollService],
})
export class LiveSessionModule {}
