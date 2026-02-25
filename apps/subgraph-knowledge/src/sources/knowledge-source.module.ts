import { Module } from '@nestjs/common';
import { KnowledgeSourceService } from './knowledge-source.service.js';
import { KnowledgeSourceResolver } from './knowledge-source.resolver.js';
import { DocumentParserService } from './document-parser.service.js';
import { EmbeddingModule } from '../embedding/embedding.module.js';

@Module({
  imports: [EmbeddingModule],
  providers: [KnowledgeSourceService, KnowledgeSourceResolver, DocumentParserService],
  exports: [KnowledgeSourceService],
})
export class KnowledgeSourceModule {}
