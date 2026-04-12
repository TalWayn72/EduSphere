/**
 * JargonModule (Transcription Worker)
 *
 * Wires the jargon post-processor service and NATS consumer.
 * NatsModule is @Global so NatsService is injected automatically.
 */
import { Module } from '@nestjs/common';
import { JargonPostProcessorService } from './jargon-post-processor.service';
import { JargonPostProcessorConsumer } from './jargon-post-processor.consumer';

@Module({
  providers: [JargonPostProcessorService, JargonPostProcessorConsumer],
  exports: [JargonPostProcessorService],
})
export class JargonModule {}
