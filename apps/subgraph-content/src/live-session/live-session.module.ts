import { Module } from '@nestjs/common';
import { LiveSessionResolver } from './live-session.resolver';
import { LiveSessionService } from './live-session.service';

@Module({
  providers: [LiveSessionResolver, LiveSessionService],
  exports: [LiveSessionService],
})
export class LiveSessionModule {}
