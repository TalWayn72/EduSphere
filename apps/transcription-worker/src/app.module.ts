import { Module } from '@nestjs/common';
import { NatsModule } from './nats/nats.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { HlsModule } from './hls/hls.module';

/**
 * Root application module for the transcription worker.
 *
 * NatsModule is @Global — its NatsService is available project-wide.
 * TranscriptionModule wires up Whisper, MinIO and the NATS consumer.
 * EmbeddingModule subscribes to embedding.requested and writes pgvector rows.
 * HlsModule provides HLS transcoding after transcription completes.
 */
@Module({
  imports: [NatsModule, TranscriptionModule, EmbeddingModule, HlsModule],
})
export class AppModule {}
