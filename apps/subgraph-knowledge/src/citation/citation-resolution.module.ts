import { Module } from '@nestjs/common';
import { CitationResolutionService } from './citation-resolution.service';
import { CitationNatsConsumer } from './citation-nats.consumer';
import { EnrichedBlockBuilderService } from './enriched-block-builder.service';
import { GraphModule } from '../graph/graph.module';

/**
 * CitationResolutionModule — wires citation resolution services and
 * NATS consumers for the semantic enrichment pipeline.
 *
 * Imports GraphModule to access CypherSourceService for graph lookups.
 */
@Module({
  imports: [GraphModule],
  providers: [
    CitationResolutionService,
    CitationNatsConsumer,
    EnrichedBlockBuilderService,
  ],
  exports: [CitationResolutionService, EnrichedBlockBuilderService],
})
export class CitationResolutionModule {}
