import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import PDFDocument from 'pdfkit';
import type { CpdReport, CpdLogEntry, CpdExportFormat } from './cpd.types.js';

const REPORT_URL_EXPIRY_SECONDS = 3600;

function sanitizeCsvCell(value: string): string {
  const stripped = value.replace(/^[=+\-@\t\r]+/, '');
  const escaped = stripped.replace(/"/g, '""');
  return `"${escaped}"`;
}

@Injectable()
export class CpdExportService {
  private readonly logger = new Logger(CpdExportService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
    this.bucket = process.env.MINIO_BUCKET ?? 'edusphere-media';
    this.s3 = new S3Client({
      endpoint,
      region: process.env.MINIO_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async generateReport(
    data: CpdReport,
    userId: string,
    tenantId: string,
    format: CpdExportFormat
  ): Promise<string> {
    const reportId = randomUUID();
    let buffer: Buffer;
    let ext: string;
    let contentType: string;

    if (format === 'CSV') {
      buffer = Buffer.from(this.buildCsvReport(data, format), 'utf-8');
      ext = 'csv';
      contentType = 'text/csv';
    } else {
      buffer = await this.buildPdfReport(data, userId, tenantId, format);
      ext = 'pdf';
      contentType = 'application/pdf';
    }

    const key = `cpd-reports/${tenantId}/${userId}/${reportId}.${ext}`;
    await this.uploadToMinio(key, buffer, contentType);
    const url = await this.getPresignedUrl(key);
    this.logger.log(
      { userId, tenantId, format, reportId },
      'CPD report generated'
    );
    return url;
  }

  private buildCsvReport(data: CpdReport, format: string): string {
    const title = sanitizeCsvCell(
      `${format} CPD Report — Total Hours: ${data.totalHours.toFixed(2)}`
    );
    const generated = sanitizeCsvCell(`Generated: ${new Date().toISOString()}`);
    const headers = [
      'Course ID',
      'Credit Type',
      'Earned Hours',
      'Completion Date',
    ].join(',');
    const rows = data.entries.map((e: CpdLogEntry) =>
      [
        sanitizeCsvCell(e.courseId),
        sanitizeCsvCell(e.creditTypeName),
        String(e.earnedHours),
        sanitizeCsvCell(e.completionDate),
      ].join(',')
    );
    return [title, generated, '', headers, ...rows].join('\n');
  }

  private buildPdfReport(
    data: CpdReport,
    userId: string,
    tenantId: string,
    format: 'NASBA' | 'AMA'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const formatLabel =
        format === 'NASBA'
          ? 'NASBA Continuing Professional Education (CPE)'
          : 'AMA PRA Continuing Medical Education (CME)';

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(`EduSphere CPD Report — ${format}`, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').text(formatLabel, { align: 'center' });
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor('#555555')
        .text(
          `Generated: ${new Date().toISOString()} | Tenant: ${tenantId} | User: ${userId}`,
          { align: 'center' }
        );
      doc.moveDown(0.8).fillColor('#000000');

      doc.fontSize(12).font('Helvetica-Bold').text('Summary');
      doc.moveDown(0.3).fontSize(10).font('Helvetica');
      doc.text(`Total CPD Hours: ${data.totalHours.toFixed(2)}`);
      data.byType.forEach((t) => {
        doc.text(
          `  ${t.name} (${t.regulatoryBody}): ${t.totalHours.toFixed(2)} hrs`
        );
      });
      doc.moveDown(0.8);

      doc.fontSize(11).font('Helvetica-Bold').text('Completion Details');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold');
      this.drawPdfRow(
        doc,
        ['Credit Type', 'Hours', 'Completion Date'],
        [180, 60, 130],
        true
      );
      doc.font('Helvetica');
      data.entries.forEach((e: CpdLogEntry, i: number) => {
        if (i % 2 === 0) {
          doc
            .rect(doc.page.margins.left, doc.y, 370, 14)
            .fill('#f9f9f9')
            .fillColor('#000000');
        }
        this.drawPdfRow(
          doc,
          [
            e.creditTypeName,
            e.earnedHours.toFixed(2),
            e.completionDate.split('T')[0] ?? e.completionDate,
          ],
          [180, 60, 130],
          false
        );
      });

      doc.moveDown(1);
      doc
        .fontSize(8)
        .fillColor('#888888')
        .text(`EduSphere Platform | ${format} Regulatory Report`, {
          align: 'center',
        });
      doc.end();
    });
  }

  private drawPdfRow(
    doc: PDFKit.PDFDocument,
    cells: string[],
    widths: number[],
    isHeader: boolean
  ): void {
    const startX = doc.page.margins.left;
    let x = startX;
    const y = doc.y;
    const rowHeight = 14;
    if (isHeader) {
      doc
        .rect(
          startX,
          y,
          widths.reduce((a, b) => a + b, 0),
          rowHeight
        )
        .fill('#e8e8e8')
        .fillColor('#000000');
    }
    cells.forEach((cell, i) => {
      doc.text(cell.slice(0, 28), x + 2, y + 2, {
        width: (widths[i] ?? 60) - 4,
        lineBreak: false,
      });
      x += widths[i] ?? 60;
    });
    doc.moveDown();
    if (doc.y > doc.page.height - 80) doc.addPage();
  }

  private async uploadToMinio(
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  private async getPresignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, {
      expiresIn: REPORT_URL_EXPIRY_SECONDS,
    });
  }
}
