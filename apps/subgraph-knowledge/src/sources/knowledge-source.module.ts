import { Module } from '@nestjs/common';
import { KnowledgeSourceService } from './knowledge-source.service.js';
import { KnowledgeSourceProcessingService } from './knowledge-source-processing.service.js';
import { KnowledgeSourceResolver } from './knowledge-source.resolver.js';
import { DocumentParserService } from './document-parser.service.js';
import { ContentIngestionResolver } from './content-ingestion.resolver.js';
import { MinioUrlService } from './minio-url.service.js';
import { EmbeddingModule } from '../embedding/embedding.module.js';
import { ContentIngestionPipelineService } from '../services/content-ingestion-pipeline.service.js';
import { TesseractOcrService } from '../services/tesseract-ocr.service.js';

@Module({
  imports: [EmbeddingModule],
  providers: [
    KnowledgeSourceProcessingService,
    KnowledgeSourceService,
    KnowledgeSourceResolver,
    DocumentParserService,
    ContentIngestionResolver,
    ContentIngestionPipelineService,
    TesseractOcrService,
    MinioUrlService,
  ],
  exports: [KnowledgeSourceService, ContentIngestionPipelineService, TesseractOcrService, DocumentParserService, MinioUrlService],
})
export class KnowledgeSourceModule {}
