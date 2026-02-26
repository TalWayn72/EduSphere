/**
 * AuditLogAdminPage — Admin audit log viewer with CSV/JSON export.
 * Route: /admin/audit-log
 * Access: ORG_ADMIN, SUPER_ADMIN only
 */
import React, { useState } from 'react';
import { useMutation } from 'urql';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Download, FileText, FileJson } from 'lucide-react';

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const EXPORT_AUDIT_LOG_MUTATION = `
  mutation ExportAuditLog($fromDate: String!, $toDate: String!, $format: AuditExportFormat!) {
    exportAuditLog(fromDate: $fromDate, toDate: $toDate, format: $format) {
      presignedUrl
      expiresAt
      recordCount
    }
  }
` as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditExportFormat = 'CSV' | 'JSON';

interface ExportAuditLogResult {
  exportAuditLog: {
    presignedUrl: string;
    expiresAt: string;
    recordCount: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditLogAdminPage() {
  const [fromDate, setFromDate] = useState<string>(thirtyDaysAgoIso());
  const [toDate, setToDate] = useState<string>(todayIso());
  const [exportingFormat, setExportingFormat] =
    useState<AuditExportFormat | null>(null);

  const [exportResult, exportAuditLog] = useMutation<ExportAuditLogResult>(
    EXPORT_AUDIT_LOG_MUTATION
  );

  const isExporting = exportResult.fetching || exportingFormat !== null;

  const handleExport = async (format: AuditExportFormat) => {
    if (!fromDate || !toDate) {
      toast.error('Please select both a start date and an end date.');
      return;
    }
    if (fromDate > toDate) {
      toast.error('Start date must be before end date.');
      return;
    }

    setExportingFormat(format);

    const result = await exportAuditLog({ fromDate, toDate, format });

    setExportingFormat(null);

    if (result.error) {
      toast.error(`Export failed: ${result.error.message}`);
      return;
    }

    const data = result.data?.exportAuditLog;
    if (!data) {
      toast.error('Export failed: no data returned.');
      return;
    }

    // Open download in new tab
    window.open(data.presignedUrl, '_blank', 'noopener,noreferrer');

    toast.success(
      `Export ready — ${data.recordCount.toLocaleString()} records. Download started.`,
      {
        action: {
          label: 'Open again',
          onClick: () =>
            window.open(data.presignedUrl, '_blank', 'noopener,noreferrer'),
        },
        duration: 8000,
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Export system audit events for compliance and review.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export Audit Log</CardTitle>
            <CardDescription>
              Select a date range and download the audit events in your
              preferred format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date range inputs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-1">
                <label
                  htmlFor="audit-from-date"
                  className="text-sm font-medium"
                >
                  Start Date
                </label>
                <Input
                  id="audit-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  disabled={isExporting}
                  max={toDate || todayIso()}
                />
              </div>
              <div className="flex-1 space-y-1">
                <label htmlFor="audit-to-date" className="text-sm font-medium">
                  End Date
                </label>
                <Input
                  id="audit-to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  disabled={isExporting}
                  min={fromDate}
                  max={todayIso()}
                />
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={() => void handleExport('CSV')}
                disabled={isExporting}
                variant="default"
                className="gap-2"
                aria-label="Export audit log as CSV"
              >
                {exportingFormat === 'CSV' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {exportingFormat === 'CSV' ? 'Exporting…' : 'Export CSV'}
              </Button>

              <Button
                onClick={() => void handleExport('JSON')}
                disabled={isExporting}
                variant="outline"
                className="gap-2"
                aria-label="Export audit log as JSON"
              >
                {exportingFormat === 'JSON' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileJson className="h-4 w-4" />
                )}
                {exportingFormat === 'JSON' ? 'Exporting…' : 'Export JSON'}
              </Button>

              {isExporting && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Download className="h-4 w-4" />
                  Preparing your export…
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
