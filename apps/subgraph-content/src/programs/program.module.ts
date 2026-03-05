import { Module } from '@nestjs/common';
import { ProgramService } from './program.service.js';
import { ProgramResolver } from './program.resolver.js';
import { ProgramEventsHandler } from './program-events.handler.js';
import { CertificateModule } from '../certificate/certificate.module.js';

@Module({
  imports: [CertificateModule],
  providers: [ProgramService, ProgramResolver, ProgramEventsHandler],
  exports: [ProgramService],
})
export class ProgramModule {}
