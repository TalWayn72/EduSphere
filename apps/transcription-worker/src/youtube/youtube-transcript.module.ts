import { Module } from '@nestjs/common';
import { YouTubeTranscriptService } from './youtube-transcript.service';
import { YouTubeIngestConsumer } from './youtube-ingest.consumer';
import { NatsModule } from '../nats/nats.module';

/**
 * YouTubeTranscriptModule — wires the YouTube transcript extraction
 * service and its NATS consumer for `lesson.youtube.ingest` events.
 */
@Module({
  imports: [NatsModule],
  providers: [YouTubeTranscriptService, YouTubeIngestConsumer],
  exports: [YouTubeTranscriptService],
})
export class YouTubeTranscriptModule {}
