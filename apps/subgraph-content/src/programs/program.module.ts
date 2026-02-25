import { Module } from '@nestjs/common';
import { ProgramService } from './program.service.js';
import { ProgramResolver } from './program.resolver.js';
import { CertificateModule } from '../certificate/certificate.module.js';

@Module({
  imports: [CertificateModule],
  providers: [ProgramService, ProgramResolver],
  exports: [ProgramService],
})
export class ProgramModule {}
