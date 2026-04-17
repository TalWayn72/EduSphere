/**
 * PolishingModule (Transcription Worker)
 *
 * Wires the NATS consumer and orchestrator for the transcript polishing pipeline.
 * NatsModule is @Global so NatsService is injected automatically.
 */
import { Module } from '@nestjs/common';
import { PolishingConsumer } from './polishing.consumer';
import { PolishingOrchestratorService } from './polishing.orchestrator';

@Module({
  providers: [PolishingConsumer, PolishingOrchestratorService],
  exports: [PolishingOrchestratorService],
})
export class PolishingModule {}
