import { Module } from '@nestjs/common';
import { ConceptExtractor } from './concept-extractor';
import { GraphBuilder } from './graph-builder';
import { HebrewCitationNerService } from './hebrew-citation-ner.service';
import { CitationNerConsumer } from './citation-ner.consumer';
import { NatsModule } from '../nats/nats.module';

@Module({
  imports: [NatsModule],
  providers: [
    ConceptExtractor,
    GraphBuilder,
    HebrewCitationNerService,
    CitationNerConsumer,
  ],
  exports: [ConceptExtractor, GraphBuilder, HebrewCitationNerService],
})
export class KnowledgeModule {}
