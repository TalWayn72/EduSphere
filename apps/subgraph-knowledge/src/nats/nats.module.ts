import { Module } from '@nestjs/common';
import { NatsConsumer } from './nats.consumer';
import { LessonNERConsumer } from './lesson-ner.consumer';
import { GraphModule } from '../graph/graph.module';

/**
 * Registers NATS consumers:
 * - NatsConsumer: subscribes to `knowledge.concepts.extracted` (transcription worker)
 * - LessonNERConsumer: subscribes to `EDUSPHERE.content.*.ner.extracted` (lesson pipeline NER)
 *
 * GraphModule is imported (not re-exported) to give consumers access to
 * CypherService without exposing internals to the rest of the application.
 */
@Module({
  imports: [GraphModule],
  providers: [NatsConsumer, LessonNERConsumer],
})
export class NatsConsumerModule {}
