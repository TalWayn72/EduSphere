/**
 * CPDReportPage — Learner CPD/CE credit summary and export.
 * Route: /cpd
 * F-027: CPD/CE Credit Tracking + Regulatory Export
 */
import React, { useState } from 'react';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MY_CPD_REPORT_QUERY, EXPORT_CPD_REPORT_MUTATION } from '@/lib/graphql/cpd.queries';
import { BookOpen, Download, Loader2, AlertCircle } from 'lucide-react';

interface CpdLogEntry {
  id: string;
  courseId: string;
  creditTypeName: string;
  earnedHours: number;
  completionDate: string;
}

interface CpdTypeSummary {
  name: string;
  regulatoryBody: string;
  totalHours: number;
}

interface CpdReport {
  totalHours: number;
  byType: CpdTypeSummary[];
  entries: CpdLogEntry[];
}

type ExportFormat = 'NASBA' | 'AMA' | 'CSV';

export function CPDReportPage() {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [{ data, fetching, error }] = useQuery<{ myCpdReport: CpdReport }>({
    query: MY_CPD_REPORT_QUERY,
  });
  const [, exportReport] = useMutation<{ exportCpdReport: string }>(EXPORT_CPD_REPORT_MUTATION);

  const report = data?.myCpdReport;

  async function handleExport(format: ExportFormat) {
    setExporting(format);
    try {
      const result = await exportReport({ format });
      const url = result.data?.exportCpdReport;
      if (url) window.open(url, '_blank');
    } finally {
      setExporting(null);
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">My CPD Report</h1>
            <p className="text-muted-foreground text-sm">Continuing Professional Development credits earned</p>
          </div>
        </div>

        {fetching && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading report...</div>}
        {error && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load CPD report: {error.message}</span>
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Total CPD Hours</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{report.totalHours.toFixed(1)}</p></CardContent>
              </Card>
              {report.byType.map((t) => (
                <Card key={t.name}>
                  <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">{t.name}</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{t.totalHours.toFixed(1)} hrs</p>
                    <p className="text-xs text-muted-foreground">{t.regulatoryBody}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Export Report</CardTitle>
                  <div className="flex gap-2">
                    {(['NASBA', 'AMA', 'CSV'] as ExportFormat[]).map((fmt) => (
                      <Button key={fmt} variant="outline" size="sm" onClick={() => handleExport(fmt)} disabled={exporting !== null}>
                        {exporting === fmt ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
                        {fmt}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader><CardTitle>Completion History</CardTitle></CardHeader>
              <CardContent>
                {report.entries.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No CPD credits earned yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">Credit Type</th>
                        <th className="text-left p-2 font-medium">Hours Earned</th>
                        <th className="text-left p-2 font-medium">Completion Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.entries.map((entry) => (
                        <tr key={entry.id} className="border-t">
                          <td className="p-2">{entry.creditTypeName}</td>
                          <td className="p-2 font-mono">{entry.earnedHours.toFixed(2)}</td>
                          <td className="p-2">{entry.completionDate.split('T')[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
