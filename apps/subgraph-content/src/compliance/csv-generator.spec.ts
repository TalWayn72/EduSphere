import { describe, it, expect } from 'vitest';
import { generateCsvReport } from './csv-generator.js';
import type { ComplianceReportRow } from './csv-generator.js';

const baseRow: ComplianceReportRow = {
  userName: 'Alice Cohen',
  userEmail: 'alice@example.com',
  department: 'Engineering',
  courseName: 'Safety Training 101',
  enrolledAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-15T00:00:00.000Z',
  score: 92,
  status: 'completed',
  complianceDueDate: '2026-02-01T00:00:00.000Z',
};

describe('generateCsvReport', () => {
  it('includes correct headers', () => {
    const csv = generateCsvReport([baseRow], 'Test Report');
    expect(csv).toContain('Name,Email,Department,Course,Enrolled,Completed,Score,Status,Due Date');
  });

  it('populates a fully-filled row correctly', () => {
    const csv = generateCsvReport([baseRow], 'Test Report');
    expect(csv).toContain('"Alice Cohen"');
    expect(csv).toContain('"alice@example.com"');
    expect(csv).toContain('"Engineering"');
    expect(csv).toContain('"Safety Training 101"');
    expect(csv).toContain('92');
    expect(csv).toContain('completed');
  });

  it('outputs empty string for null completedAt', () => {
    const row: ComplianceReportRow = { ...baseRow, completedAt: null, status: 'in_progress' };
    const csv = generateCsvReport([row], 'Test Report');
    const lines = csv.split('\n');
    // data row is after title, generated, blank line, headers
    const dataLine = lines[4] ?? '';
    const fields = dataLine.split(',');
    expect(fields[5]).toBe(''); // completedAt column
  });

  it('strips formula-injection characters from names', () => {
    const injectionRow: ComplianceReportRow = {
      ...baseRow,
      userName: '=SUM(A1:A10)',
      userEmail: '@malicious',
    };
    const csv = generateCsvReport([injectionRow], 'Test Report');
    expect(csv).not.toContain('=SUM');
    expect(csv).toContain('"SUM(A1:A10)"');
    expect(csv).not.toContain('"@malicious"');
  });

  it('escapes embedded double-quotes in string fields', () => {
    const quotedRow: ComplianceReportRow = {
      ...baseRow,
      userName: 'Bob "The Builder" Smith',
    };
    const csv = generateCsvReport([quotedRow], 'Test Report');
    expect(csv).toContain('"Bob ""The Builder"" Smith"');
  });

  it('handles null score gracefully', () => {
    const row: ComplianceReportRow = { ...baseRow, score: null };
    const csv = generateCsvReport([row], 'Test Report');
    const lines = csv.split('\n');
    const dataLine = lines[4] ?? '';
    expect(dataLine).toContain('completed');
  });

  it('handles empty rows array', () => {
    const csv = generateCsvReport([], 'Empty Report');
    expect(csv).toContain('Name,Email,Department');
    const lines = csv.split('\n').filter((l) => l.trim() !== '');
    // title + generated + headers = 3 non-empty lines
    expect(lines.length).toBe(3);
  });
});
