import { Module } from '@nestjs/common';
import { LiveSessionsResolver } from './live-sessions.resolver';
import { LiveSessionsService } from './live-sessions.service';

@Module({
  providers: [LiveSessionsResolver, LiveSessionsService],
  exports: [LiveSessionsService],
})
export class LiveSessionsModule {}
