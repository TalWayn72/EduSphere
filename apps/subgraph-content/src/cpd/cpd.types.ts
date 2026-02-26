export interface CpdLogEntry {
  id: string;
  courseId: string;
  creditTypeName: string;
  earnedHours: number;
  completionDate: string;
}

export interface CpdTypeSummary {
  name: string;
  regulatoryBody: string;
  totalHours: number;
}

export interface CpdReport {
  totalHours: number;
  byType: CpdTypeSummary[];
  entries: CpdLogEntry[];
}

export interface CreateCreditTypeInput {
  name: string;
  regulatoryBody: string;
  creditHoursPerHour: number;
}

export type CpdExportFormat = 'NASBA' | 'AMA' | 'CSV';
