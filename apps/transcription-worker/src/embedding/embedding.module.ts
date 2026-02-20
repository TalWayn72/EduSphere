import { Module } from '@nestjs/common';
import { NatsModule } from '../nats/nats.module';
import { EmbeddingWorker } from './embedding.worker';

/**
 * EmbeddingModule wires up the NATS consumer that listens for
 * `transcription.embedding.requested` and writes pgvector rows.
 */
@Module({
  imports: [NatsModule],
  providers: [EmbeddingWorker],
})
export class EmbeddingModule {}
