import { Module } from '@nestjs/common';
import { CertificateResolver } from './certificate.resolver.js';
import { CertificateService } from './certificate.service.js';
import { CertificatePdfService } from './certificate-pdf.service.js';

@Module({
  providers: [CertificateResolver, CertificateService, CertificatePdfService],
  exports: [CertificateService],
})
export class CertificateModule {}
