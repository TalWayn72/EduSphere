import { Module } from '@nestjs/common';
import { CertificateResolver } from './certificate.resolver.js';
import { CertificateService } from './certificate.service.js';
import { CertificatePdfService } from './certificate-pdf.service.js';
import { CertificateDownloadService } from './certificate-download.service.js';
import { BadgeIssuerService } from './badge-issuer.service.js';

@Module({
  providers: [
    CertificateResolver,
    CertificateService,
    CertificatePdfService,
    CertificateDownloadService,
    BadgeIssuerService,
  ],
  exports: [CertificateService, CertificateDownloadService, BadgeIssuerService],
})
export class CertificateModule {}
