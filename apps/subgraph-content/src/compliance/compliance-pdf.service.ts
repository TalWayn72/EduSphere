import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { ComplianceReportRow } from './csv-generator.js';

export interface CompliancePdfInput {
  title: string;
  tenantName: string;
  asOf: Date;
  rows: ComplianceReportRow[];
  summary: {
    totalUsers: number;
    totalEnrollments: number;
    completedCount: number;
    completionRate: number;
    overdueCount: number;
  };
}

@Injectable()
export class CompliancePdfService {
  private readonly logger = new Logger(CompliancePdfService.name);

  generatePdf(input: CompliancePdfInput): Promise<Buffer> {
    this.logger.debug(
      `Generating compliance PDF: tenant=${input.tenantName} rows=${input.rows.length}`
    );
    return this.buildPdf(input);
  }

  private buildPdf(input: CompliancePdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        layout: 'landscape',
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawHeader(doc, input);
      this.drawSummary(doc, input.summary);
      this.drawTable(doc, input.rows);
      this.drawFooter(doc, input.tenantName);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument, input: CompliancePdfInput): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('EduSphere Compliance Training Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').text(input.title, { align: 'center' });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor('#555555')
      .text(
        `As of: ${input.asOf.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        { align: 'center' }
      );
    doc.moveDown(0.8);
    doc.fillColor('#000000');
  }

  private drawSummary(
    doc: PDFKit.PDFDocument,
    s: CompliancePdfInput['summary']
  ): void {
    doc.fontSize(12).font('Helvetica-Bold').text('Summary');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');

    const summaryLines = [
      `Total Users: ${s.totalUsers}`,
      `Total Enrollments: ${s.totalEnrollments}`,
      `Completed: ${s.completedCount}`,
      `Completion Rate: ${s.completionRate.toFixed(1)}%`,
      `Overdue: ${s.overdueCount}`,
    ];
    summaryLines.forEach((line) => doc.text(line));
    doc.moveDown(0.8);
  }

  private drawTable(
    doc: PDFKit.PDFDocument,
    rows: ComplianceReportRow[]
  ): void {
    const colWidths = [100, 120, 80, 110, 60, 60, 40, 70, 65];
    const headers = [
      'Name',
      'Email',
      'Department',
      'Course',
      'Enrolled',
      'Completed',
      'Score',
      'Status',
      'Due Date',
    ];

    doc.fontSize(9).font('Helvetica-Bold');
    this.drawRow(doc, headers, colWidths, true);
    doc.font('Helvetica');

    rows.forEach((row, i) => {
      if (i % 2 === 0) this.shadeRow(doc, colWidths);
      this.drawRow(
        doc,
        [
          row.userName,
          row.userEmail,
          row.department ?? '',
          row.courseName,
          row.enrolledAt ?? '',
          row.completedAt ?? '',
          row.score?.toString() ?? '',
          row.status,
          row.complianceDueDate ?? '',
        ],
        colWidths,
        false
      );
    });
  }

  private drawRow(
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
      doc.text(cell.slice(0, 20), x + 2, y + 2, {
        width: (widths[i] ?? 60) - 4,
        lineBreak: false,
      });
      x += widths[i] ?? 60;
    });
    doc.moveDown();
    if (doc.y > doc.page.height - 80) doc.addPage({ layout: 'landscape' });
  }

  private shadeRow(doc: PDFKit.PDFDocument, widths: number[]): void {
    const startX = doc.page.margins.left;
    doc
      .rect(
        startX,
        doc.y,
        widths.reduce((a, b) => a + b, 0),
        14
      )
      .fill('#f9f9f9')
      .fillColor('#000000');
  }

  private drawFooter(doc: PDFKit.PDFDocument, tenantName: string): void {
    doc.moveDown(1);
    doc
      .fontSize(8)
      .fillColor('#888888')
      .text(
        `Tenant: ${tenantName} | Generated: ${new Date().toISOString()} | EduSphere Platform`,
        { align: 'center' }
      );
  }
}
