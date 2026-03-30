import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HocuspocusService } from './hocuspocus.service';
import { CrdtCompactionService } from './crdt-compaction.service';
import { CollabDocumentService } from './collab-document.service';
import { CollabDocumentResolver } from './collab-document.resolver';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    HocuspocusService,
    CrdtCompactionService,
    CollabDocumentService,
    CollabDocumentResolver,
  ],
  exports: [HocuspocusService, CrdtCompactionService, CollabDocumentService],
})
export class CrdtModule {}
