import { Module } from '@nestjs/common';
import { GraphResolver } from './graph.resolver';
import { GraphService } from './graph.service';
import { CypherService } from './cypher.service';

@Module({
  providers: [GraphResolver, GraphService, CypherService],
  exports: [GraphService],
})
export class GraphModule {}
