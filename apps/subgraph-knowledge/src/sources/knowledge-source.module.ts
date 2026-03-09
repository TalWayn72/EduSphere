import { Module } from '@nestjs/common';
import { KnowledgeSourceService } from './knowledge-source.service.js';
import { KnowledgeSourceResolver } from './knowledge-source.resolver.js';
import { DocumentParserService } from './document-parser.service.js';
import { ContentIngestionResolver } from './content-ingestion.resolver.js';
import { EmbeddingModule } from '../embedding/embedding.module.js';
import { ContentIngestionPipelineService } from '../services/content-ingestion-pipeline.service.js';
import { TesseractOcrService } from '../services/tesseract-ocr.service.js';

@Module({
  imports: [EmbeddingModule],
  providers: [
    KnowledgeSourceService,
    KnowledgeSourceResolver,
    DocumentParserService,
    ContentIngestionResolver,
    ContentIngestionPipelineService,
    TesseractOcrService,
  ],
  exports: [KnowledgeSourceService, ContentIngestionPipelineService, TesseractOcrService],
})
export class KnowledgeSourceModule {}
