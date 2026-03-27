import { Module } from '@nestjs/common';
import { NatsConsumer } from './nats.consumer';
import { LessonNERConsumer } from './lesson-ner.consumer';
import { ConceptExtractionPublisherService } from './concept-extraction-publisher.service';
import { TranscriptBridgeConsumer } from './transcript-bridge.consumer';
import { GraphModule } from '../graph/graph.module';
import { KnowledgeSourceModule } from '../sources/knowledge-source.module';
import { EmbeddingModule } from '../embedding/embedding.module';

/**
 * Registers NATS consumers and publishers:
 * - NatsConsumer: subscribes to `knowledge.concepts.extracted` (transcription worker)
 * - LessonNERConsumer: subscribes to `EDUSPHERE.content.*.ner.extracted` (lesson pipeline NER)
 * - ConceptExtractionPublisherService: publishes concepts when KnowledgeSource becomes READY
 * - TranscriptBridgeConsumer: listens for `transcription.completed` → creates KnowledgeSource
 *
 * GraphModule is imported to give consumers access to CypherService.
 * KnowledgeSourceModule is imported to give TranscriptBridgeConsumer access to parser + embeddings.
 */
@Module({
  imports: [GraphModule, KnowledgeSourceModule, EmbeddingModule],
  providers: [
    NatsConsumer,
    LessonNERConsumer,
    ConceptExtractionPublisherService,
    TranscriptBridgeConsumer,
  ],
  exports: [ConceptExtractionPublisherService],
})
export class NatsConsumerModule {}
