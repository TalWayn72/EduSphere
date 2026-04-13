import { Module } from '@nestjs/common';
import { LiveStreamResolver } from './live-stream.resolver';
import { LiveStreamSubscriptionResolver } from './live-stream.subscription';
import { LiveStreamService } from './live-stream.service';
import { LiveStreamQueryService } from './live-stream-query.service';
import { PresenceService } from './presence.service';
import { VodConverterService } from './vod-converter.service';

@Module({
  providers: [
    LiveStreamResolver,
    LiveStreamSubscriptionResolver,
    LiveStreamService,
    LiveStreamQueryService,
    PresenceService,
    VodConverterService,
  ],
  exports: [
    LiveStreamService,
    LiveStreamQueryService,
    PresenceService,
    VodConverterService,
  ],
})
export class LiveStreamModule {}
