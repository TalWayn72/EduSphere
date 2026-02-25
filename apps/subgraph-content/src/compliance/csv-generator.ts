export type ComplianceStatus = 'completed' | 'in_progress' | 'not_started' | 'overdue';

export interface ComplianceReportRow {
  userName: string;
  userEmail: string;
  department?: string;
  courseName: string;
  enrolledAt: string;
  completedAt: string | null;
  score: number | null;
  status: ComplianceStatus;
  complianceDueDate: string | null;
}

/** Sanitize a cell value to prevent CSV injection attacks.
 *  Wraps in quotes and escapes embedded quotes. Strips leading
 *  formula characters (=, +, -, @) to prevent spreadsheet formula injection.
 */
function sanitizeCell(value: string): string {
  // Strip formula-injection characters at the start
  const stripped = value.replace(/^[=+\-@\t\r]+/, '');
  // Escape embedded double-quotes by doubling them
  const escaped = stripped.replace(/"/g, '""');
  return `"${escaped}"`;
}

/** Format a nullable Date to ISO date string (YYYY-MM-DD) or empty string */
function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().split('T')[0] ?? '';
}

export function generateCsvReport(rows: ComplianceReportRow[], title: string): string {
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
  ].join(',');

  const dataRows = rows.map((row) =>
    [
      sanitizeCell(row.userName),
      sanitizeCell(row.userEmail),
      sanitizeCell(row.department ?? ''),
      sanitizeCell(row.courseName),
      row.enrolledAt ? formatDate(row.enrolledAt) : '',
      row.completedAt ? formatDate(row.completedAt) : '',
      row.score !== null && row.score !== undefined ? String(row.score) : '',
      row.status,
      row.complianceDueDate ? formatDate(row.complianceDueDate) : '',
    ].join(','),
  );

  const titleRow = sanitizeCell(title);
  const generatedRow = sanitizeCell(`Generated: ${new Date().toISOString()}`);

  return [titleRow, generatedRow, '', headers, ...dataRows].join('\n');
}
