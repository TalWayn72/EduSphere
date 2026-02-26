import { Module } from '@nestjs/common';
import { KnowledgeSourceService } from './knowledge-source.service.js';
import { KnowledgeSourceResolver } from './knowledge-source.resolver.js';
import { KnowledgeSourceController } from './knowledge-source.controller.js';
import { DocumentParserService } from './document-parser.service.js';
import { EmbeddingModule } from '../embedding/embedding.module.js';

@Module({
  imports: [EmbeddingModule],
  controllers: [KnowledgeSourceController],
  providers: [
    KnowledgeSourceService,
    KnowledgeSourceResolver,
    DocumentParserService,
  ],
  exports: [KnowledgeSourceService],
})
export class KnowledgeSourceModule {}
