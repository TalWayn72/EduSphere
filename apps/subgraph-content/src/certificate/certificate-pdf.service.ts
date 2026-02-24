import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { minioConfig } from '@edusphere/config';
import { randomUUID } from 'crypto';

interface CertificatePdfInput {
  tenantId: string;
  userId: string;
  courseId: string;
  learnerName: string;
  courseName: string;
  issuedAt: Date;
  verificationCode: string;
}

@Injectable()
export class CertificatePdfService {
  private readonly logger = new Logger(CertificatePdfService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    const scheme = minioConfig.useSSL ? 'https' : 'http';
    const endpoint = `${scheme}://${minioConfig.endpoint}:${minioConfig.port}`;
    this.bucket = minioConfig.bucket;
    this.s3 = new S3Client({
      endpoint,
      region: minioConfig.region,
      credentials: {
        accessKeyId: minioConfig.accessKey,
        secretAccessKey: minioConfig.secretKey,
      },
      forcePathStyle: true,
    });
  }

  async generateAndUpload(input: CertificatePdfInput): Promise<string> {
    const pdfBuffer = await this.buildPdf(input);
    const fileKey = `${input.tenantId}/certificates/${input.userId}/${randomUUID()}.pdf`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }),
    );

    this.logger.log(`Certificate PDF uploaded: key=${fileKey}`);
    return fileKey;
  }

  private buildPdf(input: CertificatePdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 60, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(32).font('Helvetica-Bold').text('Certificate of Completion', { align: 'center' });
      doc.moveDown(1.5);

      // Body
      doc.fontSize(16).font('Helvetica').text('This certifies that', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(26).font('Helvetica-Bold').text(input.learnerName, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica').text('has successfully completed the course', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(22).font('Helvetica-Bold').text(input.courseName, { align: 'center' });
      doc.moveDown(1.5);

      // Date
      const dateStr = input.issuedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc.fontSize(14).font('Helvetica').text(`Issued on: ${dateStr}`, { align: 'center' });
      doc.moveDown(0.5);

      // Verification code
      doc.fontSize(11).fillColor('#888888')
        .text(`Verification Code: ${input.verificationCode}`, { align: 'center' });

      doc.end();
    });
  }
}
