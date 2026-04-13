/**
 * GlossaryModule
 *
 * NestJS module for the glossary feature.
 * Imports JargonModule for JargonTermService access.
 */
import { Module } from '@nestjs/common';
import { GlossaryService } from './glossary.service.js';
import { GlossaryAggregationService } from './glossary-aggregation.service.js';
import { GlossaryResolver } from './glossary.resolver.js';
import { GlossaryFieldsResolver } from './glossary-fields.resolver.js';
import { JargonModule } from '../jargon/jargon.module.js';

@Module({
  imports: [JargonModule],
  providers: [
    GlossaryService,
    GlossaryAggregationService,
    GlossaryResolver,
    GlossaryFieldsResolver,
  ],
  exports: [GlossaryService, GlossaryAggregationService],
})
export class GlossaryModule {}
