import { Module } from '@nestjs/common';
import { NatsModule } from './nats/nats.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { HlsModule } from './hls/hls.module';
import { YouTubeTranscriptModule } from './youtube/youtube-transcript.module';
import { JargonModule } from './jargon/jargon.module';
import { LiveTranscriptionModule } from './live-transcription/live-transcription.module';
import { PolishingModule } from './polishing/polishing.module';

/**
 * Root application module for the transcription worker.
 *
 * NatsModule is @Global — its NatsService is available project-wide.
 * TranscriptionModule wires up Whisper, MinIO and the NATS consumer.
 * EmbeddingModule subscribes to embedding.requested and writes pgvector rows.
 * HlsModule provides HLS transcoding after transcription completes.
 * YouTubeTranscriptModule handles YouTube caption extraction and ingest.
 * PolishingModule consumes jargon.detection.completed and runs AI polishing.
 */
@Module({
  imports: [
    NatsModule,
    TranscriptionModule,
    EmbeddingModule,
    HlsModule,
    YouTubeTranscriptModule,
    JargonModule,
    LiveTranscriptionModule,
    PolishingModule,
  ],
})
export class AppModule {}
