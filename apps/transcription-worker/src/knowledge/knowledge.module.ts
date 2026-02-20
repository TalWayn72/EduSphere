import { Module } from '@nestjs/common';
import { ConceptExtractor } from './concept-extractor';
import { GraphBuilder } from './graph-builder';
import { NatsModule } from '../nats/nats.module';

@Module({
  imports: [NatsModule],
  providers: [ConceptExtractor, GraphBuilder],
  exports: [ConceptExtractor, GraphBuilder],
})
export class KnowledgeModule {}
