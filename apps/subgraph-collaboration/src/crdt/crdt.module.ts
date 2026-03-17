import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HocuspocusService } from './hocuspocus.service';
import { CrdtCompactionService } from './crdt-compaction.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [HocuspocusService, CrdtCompactionService],
  exports: [HocuspocusService, CrdtCompactionService],
})
export class CrdtModule {}
