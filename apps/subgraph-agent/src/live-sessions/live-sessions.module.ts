import { Module } from '@nestjs/common';
import { LiveSessionsResolver } from './live-sessions.resolver';
import { LiveSessionsService } from './live-sessions.service';
import { LiveSessionsEventsService } from './live-sessions-events.service';

@Module({
  providers: [LiveSessionsResolver, LiveSessionsService, LiveSessionsEventsService],
  exports: [LiveSessionsService, LiveSessionsEventsService],
})
export class LiveSessionsModule {}
