import { Module } from '@nestjs/common';
import { NatsConsumer } from './nats.consumer';
import { GraphModule } from '../graph/graph.module';

/**
 * Registers the NATS consumer that subscribes to `knowledge.concepts.extracted`
 * and persists extracted concepts into Apache AGE via CypherService.
 *
 * GraphModule is imported (not re-exported) to give NatsConsumer access to
 * CypherService without exposing internals to the rest of the application.
 */
@Module({
  imports: [GraphModule],
  providers: [NatsConsumer],
})
export class NatsConsumerModule {}
