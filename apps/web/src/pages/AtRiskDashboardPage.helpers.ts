/**
 * AtRiskDashboardPage helpers — filtering, sorting, CSV export, and row mapping.
 */
import type { AtRiskLearnerRow } from '@/components/AtRiskLearnersTable';

export const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

export type RiskFilter = 'all' | 'high' | 'medium' | 'low';
export type SortKey = 'risk' | 'inactive' | 'progress';

export function applyFilter(
  rows: AtRiskLearnerRow[],
  filter: RiskFilter
): AtRiskLearnerRow[] {
  if (filter === 'high') return rows.filter((r) => r.riskScore > 0.7);
  if (filter === 'medium')
    return rows.filter((r) => r.riskScore >= 0.5 && r.riskScore <= 0.7);
  if (filter === 'low') return rows.filter((r) => r.riskScore < 0.5);
  return rows;
}

export function applySort(
  rows: AtRiskLearnerRow[],
  sort: SortKey
): AtRiskLearnerRow[] {
  const copy = [...rows];
  if (sort === 'risk') copy.sort((a, b) => b.riskScore - a.riskScore);
  if (sort === 'inactive')
    copy.sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity);
  if (sort === 'progress')
    copy.sort((a, b) => a.progressPercent - b.progressPercent);
  return copy;
}

export function exportCsv(rows: AtRiskLearnerRow[]) {
  const header =
    'learnerId,courseId,riskScore,daysSinceLastActivity,progressPercent,flaggedAt';
  const body = rows
    .map((r) =>
      [
        r.learnerId,
        r.courseId,
        r.riskScore,
        r.daysSinceLastActivity,
        r.progressPercent,
        r.flaggedAt,
      ].join(',')
    )
    .join(String.fromCharCode(10));
  const blob = new Blob([header + String.fromCharCode(10) + body], {
    type: 'text/csv',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'at-risk-learners.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** Map real GraphQL AtRiskLearner to the table's AtRiskLearnerRow shape */
export function toTableRow(r: {
  userId: string;
  displayName: string;
  courseId: string;
  courseTitle: string;
  daysSinceActive: number;
  progressPct: number;
}): AtRiskLearnerRow {
  const riskScore = Math.max(0, Math.min(1, (100 - r.progressPct) / 100));
  const riskFactors: AtRiskLearnerRow['riskFactors'] = [];
  if (r.daysSinceActive >= 7) {
    riskFactors.push({
      key: 'inactivity',
      description: `No activity for ${r.daysSinceActive} days`,
    });
  }
  if (r.progressPct < 30) {
    riskFactors.push({
      key: 'low_progress',
      description: 'Below 30% completion',
    });
  }
  return {
    learnerId: r.userId,
    courseId: r.courseId,
    riskScore,
    daysSinceLastActivity: r.daysSinceActive,
    progressPercent: r.progressPct,
    flaggedAt: new Date().toISOString(),
    riskFactors,
  };
}
