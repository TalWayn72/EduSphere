/**
 * TenantAnalyticsPage.cohort — Cohort retention heatmap table.
 * Colour-codes completion rate: >80% green, 50–80% yellow, <50% red.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CohortRow {
  cohortWeek: string;
  enrolled: number;
  activeAt7Days: number;
  activeAt30Days: number;
  completionRate30Days: number;
}

interface CohortRetentionTableProps {
  rows: CohortRow[];
}

function completionColor(rate: number): string {
  if (rate >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  if (rate >= 0.5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
}

export function CohortRetentionTable({ rows }: CohortRetentionTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Cohort Retention</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm"
            aria-label="Cohort retention table"
          >
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Week</th>
                <th className="pb-2 pr-4 font-medium text-right">Enrolled</th>
                <th className="pb-2 pr-4 font-medium text-right">Active@7d</th>
                <th className="pb-2 pr-4 font-medium text-right">Active@30d</th>
                <th className="pb-2 font-medium text-right">Completion@30d</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.cohortWeek} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs">{row.cohortWeek}</td>
                  <td className="py-2 pr-4 text-right">{row.enrolled}</td>
                  <td className="py-2 pr-4 text-right">{row.activeAt7Days}</td>
                  <td className="py-2 pr-4 text-right">{row.activeAt30Days}</td>
                  <td className="py-2 text-right">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${completionColor(row.completionRate30Days)}`}
                    >
                      {(row.completionRate30Days * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 text-center text-muted-foreground"
                  >
                    No cohort data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
