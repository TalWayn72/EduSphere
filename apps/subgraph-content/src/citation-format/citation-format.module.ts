import { Module } from '@nestjs/common';
import { CitationFormatService } from './citation-format.service';
import { CitationFormatResolver } from './citation-format.resolver';

@Module({
  providers: [CitationFormatService, CitationFormatResolver],
  exports: [CitationFormatService],
})
export class CitationFormatModule {}
