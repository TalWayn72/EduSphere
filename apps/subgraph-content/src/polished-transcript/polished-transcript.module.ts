import { Module } from '@nestjs/common';
import { PolishedTranscriptService } from './polished-transcript.service';
import { PolishedTranscriptMutationsService } from './polished-transcript-mutations.service';
import { PolishingSubscriptionService } from './polished-transcript-subscription.service';
import { PolishedTranscriptResolver } from './polished-transcript.resolver';

@Module({
  providers: [
    PolishedTranscriptService,
    PolishedTranscriptMutationsService,
    PolishingSubscriptionService,
    PolishedTranscriptResolver,
  ],
  exports: [PolishedTranscriptService],
})
export class PolishedTranscriptModule {}
