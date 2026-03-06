import { Module } from '@nestjs/common';
import { ProctoringResolver } from './proctoring.resolver';
import { ProctoringService } from './proctoring.service';

@Module({
  providers: [ProctoringResolver, ProctoringService],
  exports: [ProctoringService],
})
export class ProctoringModule {}
