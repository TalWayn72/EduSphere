/**
 * GapAnalysisDashboardPage — Knowledge gap analysis for ORG_ADMIN / SUPER_ADMIN.
 * Route: /admin/gap-analysis
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthRole } from '@/hooks/useAuthRole';

const ALLOWED_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

type GapType = 'NOT_STARTED' | 'LOW_MASTERY' | 'MISSING_PREREQUISITE';
type Severity = 'HIGH' | 'MEDIUM' | 'LOW';

interface KnowledgeGap {
  topicId: string;
  topicName: string;
  gapType: GapType;
  severity: Severity;
  affectedUserCount: number;
  recommendedAction: string;
}

const MOCK_GAPS: KnowledgeGap[] = [
  { topicId: 't1', topicName: 'Advanced GraphRAG', gapType: 'NOT_STARTED', severity: 'HIGH', affectedUserCount: 45, recommendedAction: 'Assign "GraphRAG Fundamentals" course' },
  { topicId: 't2', topicName: 'Knowledge Graph Design', gapType: 'LOW_MASTERY', severity: 'MEDIUM', affectedUserCount: 23, recommendedAction: 'Schedule workshop session' },
  { topicId: 't3', topicName: 'Vector Embeddings', gapType: 'MISSING_PREREQUISITE', severity: 'HIGH', affectedUserCount: 67, recommendedAction: 'Complete "Linear Algebra" prerequisite first' },
];

const GAP_TYPE_BADGE: Record<GapType, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-700',
  LOW_MASTERY: 'bg-yellow-100 text-yellow-700',
  MISSING_PREREQUISITE: 'bg-red-100 text-red-700',
};

const SEVERITY_BADGE: Record<Severity, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
};

export function GapAnalysisDashboardPage() {
  const navigate = useNavigate();
  const role = useAuthRole();

  if (!role || !ALLOWED_ROLES.has(role)) {
    navigate('/dashboard');
    return (
      <div data-testid="access-denied" className="p-8 text-center text-destructive">
        Access Denied — insufficient permissions.
      </div>
    );
  }

  const totalGaps = MOCK_GAPS.length;
  const totalAffected = MOCK_GAPS.reduce((a, g) => a + g.affectedUserCount, 0);
  const coveragePct = Math.max(0, 100 - Math.round((totalAffected / 300) * 100));

  return (
    <AdminLayout title="Gap Analysis Dashboard" description="Knowledge gaps across your organisation">
      <div data-testid="gap-analysis-page" className="space-y-6">
        {/* Summary card */}
        <Card data-testid="gap-summary-card">
          <CardHeader>
            <CardTitle>Tenant Coverage</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-8">
            <div>
              <p className="text-3xl font-bold text-primary">{coveragePct}%</p>
              <p className="text-sm text-muted-foreground">Topics covered</p>
            </div>
            <div>
              <p data-testid="total-gaps-count" className="text-3xl font-bold text-destructive">{totalGaps}</p>
              <p className="text-sm text-muted-foreground">Active gaps</p>
            </div>
          </CardContent>
        </Card>

        {/* Critical gaps table */}
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table data-testid="critical-gaps-table" className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Topic</th>
                    <th className="pb-3 pr-4 font-medium">Gap Type</th>
                    <th className="pb-3 pr-4 font-medium">Severity</th>
                    <th className="pb-3 pr-4 font-medium">Affected Users</th>
                    <th className="pb-3 font-medium">Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_GAPS.map((gap) => (
                    <tr key={gap.topicId} className="border-b hover:bg-muted/30">
                      <td className="py-3 pr-4 font-medium">{gap.topicName}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${GAP_TYPE_BADGE[gap.gapType]}`}>
                          {gap.gapType}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[gap.severity]}`}>
                          {gap.severity}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{gap.affectedUserCount}</td>
                      <td className="py-3 text-muted-foreground">{gap.recommendedAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Export */}
        <div className="flex justify-end">
          <Button
            data-testid="export-gap-report-btn"
            variant="outline"
            onClick={() => window.print()}
          >
            Export Report
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
