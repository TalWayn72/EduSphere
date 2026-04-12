/**
 * JargonModule
 *
 * NestJS module wiring all jargon services and resolvers.
 * Imports EmbeddingModule for the EmbeddingProviderService.
 */
import { Module } from '@nestjs/common';
import { JargonDomainService } from './jargon-domain.service.js';
import { JargonDomainDetectService } from './jargon-domain-detect.service.js';
import { JargonTermService } from './jargon-term.service.js';
import { JargonDetectionService } from './jargon-detection.service.js';
import {
  JargonDomainResolver,
  JargonTermResolver,
  JargonOccurrenceResolver,
} from './jargon.resolver.js';
import { EmbeddingModule } from '../embedding/embedding.module.js';

@Module({
  imports: [EmbeddingModule],
  providers: [
    JargonDomainDetectService,
    JargonDomainService,
    JargonTermService,
    JargonDetectionService,
    JargonDomainResolver,
    JargonTermResolver,
    JargonOccurrenceResolver,
  ],
  exports: [
    JargonDomainService,
    JargonTermService,
    JargonDetectionService,
  ],
})
export class JargonModule {}
