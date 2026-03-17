/**
 * GapAnalysisTable — renders skill gap items in a table.
 * Extracted from GapAnalysisDashboardPage for the 150-line limit.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GapItem {
  conceptName: string;
  isMastered: boolean;
  recommendedContentItems: string[];
  recommendedContentTitles: string[];
  relevanceScore: number;
}

const MASTERY_BADGE: Record<string, string> = {
  true: 'bg-green-100 text-green-700',
  false: 'bg-red-100 text-red-700',
};

function relevanceBadge(score: number): string {
  if (score >= 0.8) return 'bg-red-100 text-red-700';
  if (score >= 0.5) return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700';
}

export function GapAnalysisTable({ gaps }: { gaps: GapItem[] }) {
  if (gaps.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No knowledge gaps detected. All concepts mastered!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Knowledge Gaps</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table data-testid="critical-gaps-table" className="w-full text-sm" aria-label="Knowledge gap analysis results">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="pb-3 pr-4 font-medium">Concept</th>
                <th scope="col" className="pb-3 pr-4 font-medium">Status</th>
                <th scope="col" className="pb-3 pr-4 font-medium">Relevance</th>
                <th scope="col" className="pb-3 font-medium">Recommended Content</th>
              </tr>
            </thead>
            <tbody>
              {gaps.filter((g) => !g.isMastered).map((gap) => (
                <tr key={gap.conceptName} className="border-b hover:bg-muted/30">
                  <td className="py-3 pr-4 font-medium">{gap.conceptName}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${MASTERY_BADGE[String(gap.isMastered)]}`}>
                      {gap.isMastered ? 'Mastered' : 'Gap'}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${relevanceBadge(gap.relevanceScore)}`}>
                      {Math.round(gap.relevanceScore * 100)}%
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {gap.recommendedContentTitles.length > 0
                      ? gap.recommendedContentTitles.join(', ')
                      : 'No recommendations available'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
