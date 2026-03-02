import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── PDFKit mock ───────────────────────────────────────────────────────────────
// Fires data + end events synchronously when doc.end() is called.
// Includes page, addPage, y, and height to handle drawRow page-break logic.

vi.mock('pdfkit', () => ({
  default: vi.fn(function () {
    const handlers: Record<string, Array<(d: Buffer) => void>> = {};
    const doc = {
      on: (ev: string, cb: (d: Buffer) => void) => {
        (handlers[ev] ??= []).push(cb);
      },
      end: () => {
        handlers['data']?.forEach((cb) => cb(Buffer.from('PDF')));
        handlers['end']?.forEach((cb) => cb(Buffer.from('')));
      },
      fontSize: function () {
        return doc;
      },
      font: function () {
        return doc;
      },
      text: function () {
        return doc;
      },
      moveDown: function () {
        return doc;
      },
      fillColor: function () {
        return doc;
      },
      rect: function () {
        return doc;
      },
      fill: function () {
        return doc;
      },
      stroke: function () {
        return doc;
      },
      lineWidth: function () {
        return doc;
      },
      moveTo: function () {
        return doc;
      },
      lineTo: function () {
        return doc;
      },
      addPage: function () {
        return doc;
      },
      // y well below page.height - 80 so addPage is not triggered by default
      y: 100,
      page: { width: 842, height: 595, margins: { left: 40 } },
    };
    return doc;
  }),
}));

import { CompliancePdfService } from './compliance-pdf.service.js';
import type { CompliancePdfInput } from './compliance-pdf.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SUMMARY = {
  totalUsers: 10,
  totalEnrollments: 20,
  completedCount: 15,
  completionRate: 75.0,
  overdueCount: 2,
};

const SINGLE_ROW = {
  userName: 'Alice Cohen',
  userEmail: 'alice@example.com',
  department: 'Engineering',
  courseName: 'Safety Training',
  enrolledAt: '2026-01-01',
  completedAt: '2026-01-10',
  score: 92,
  status: 'completed' as const,
  complianceDueDate: '2026-02-01',
};

function makeInput(
  rows: CompliancePdfInput['rows'] = [SINGLE_ROW]
): CompliancePdfInput {
  return {
    title: 'Q1 Compliance Report',
    tenantName: 'Acme Corp',
    asOf: new Date('2026-03-01T00:00:00.000Z'),
    rows,
    summary: SUMMARY,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CompliancePdfService', () => {
  let service: CompliancePdfService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CompliancePdfService();
  });

  // Test 1: service instantiates without error
  it('service instantiates without error', () => {
    expect(() => new CompliancePdfService()).not.toThrow();
  });

  // Test 2: generatePdf resolves to a Buffer
  it('generatePdf — resolves to a Buffer', async () => {
    const result = await service.generatePdf(makeInput());
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  // Test 3: generatePdf Buffer is non-empty
  it('generatePdf — Buffer is non-empty', async () => {
    const result = await service.generatePdf(makeInput());
    expect(result.length).toBeGreaterThan(0);
  });

  // Test 4: generatePdf with empty rows does not throw
  it('generatePdf — with empty rows does not throw', async () => {
    await expect(service.generatePdf(makeInput([]))).resolves.not.toThrow();
  });

  // Test 5: generatePdf with multiple rows completes successfully
  it('generatePdf — with multiple rows resolves to a Buffer', async () => {
    const rows = [
      SINGLE_ROW,
      {
        userName: 'Bob Levi',
        userEmail: 'bob@example.com',
        department: undefined,
        courseName: 'GDPR Basics',
        enrolledAt: '2026-01-05',
        completedAt: null,
        score: null,
        status: 'in_progress' as const,
        complianceDueDate: null,
      },
      {
        userName: 'Carol Mizrahi',
        userEmail: 'carol@example.com',
        department: 'HR',
        courseName: 'Fire Safety',
        enrolledAt: '2026-01-02',
        completedAt: null,
        score: null,
        status: 'overdue' as const,
        complianceDueDate: '2026-01-31',
      },
    ];

    const result = await service.generatePdf(makeInput(rows));
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});
