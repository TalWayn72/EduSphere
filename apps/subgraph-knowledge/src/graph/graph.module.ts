import { Module } from '@nestjs/common';
import { GraphResolver } from './graph.resolver';
import { GraphService } from './graph.service';
import { CypherService } from './cypher.service';
import { EmbeddingModule } from '../embedding/embedding.module';

@Module({
  imports: [EmbeddingModule],
  providers: [GraphResolver, GraphService, CypherService],
  exports: [GraphService, CypherService],
})
export class GraphModule {}
