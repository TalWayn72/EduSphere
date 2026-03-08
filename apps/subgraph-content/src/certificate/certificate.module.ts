import { Module } from '@nestjs/common';
import { CertificateResolver } from './certificate.resolver.js';
import { CertificateService } from './certificate.service.js';
import { CertificatePdfService } from './certificate-pdf.service.js';
import { CertificateDownloadService } from './certificate-download.service.js';

@Module({
  providers: [
    CertificateResolver,
    CertificateService,
    CertificatePdfService,
    CertificateDownloadService,
  ],
  exports: [CertificateService, CertificateDownloadService],
})
export class CertificateModule {}
