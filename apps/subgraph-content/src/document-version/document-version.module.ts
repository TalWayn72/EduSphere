import { Module } from '@nestjs/common';
import { DocumentVersionService } from './document-version.service';
import { DocumentVersionResolver } from './document-version.resolver';

@Module({
  providers: [DocumentVersionService, DocumentVersionResolver],
  exports: [DocumentVersionService],
})
export class DocumentVersionModule {}
