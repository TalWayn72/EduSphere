import { Module } from '@nestjs/common';
import { LiveSessionResolver } from './live-session.resolver';
import { LiveSessionService } from './live-session.service';
import { BreakoutService } from './breakout.service';
import { PollService } from './poll.service';
import { LiveSessionExtensionsResolver } from './live-session-extensions.resolver';

@Module({
  providers: [
    LiveSessionResolver,
    LiveSessionService,
    BreakoutService,
    PollService,
    LiveSessionExtensionsResolver,
  ],
  exports: [LiveSessionService, BreakoutService, PollService],
})
export class LiveSessionModule {}
