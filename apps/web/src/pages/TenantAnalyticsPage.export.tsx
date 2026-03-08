/**
 * TenantAnalyticsPage.export — CSV/XLSX export button for tenant analytics.
 * Calls exportTenantAnalytics mutation and opens the pre-signed URL in a new tab.
 */
import React from 'react';
import { useMutation } from 'urql';
import { EXPORT_TENANT_ANALYTICS_MUTATION } from '@/lib/graphql/tenant-analytics.queries';

interface ExportAnalyticsButtonProps {
  period: string;
}

export function ExportAnalyticsButton({ period }: ExportAnalyticsButtonProps) {
  const [{ fetching }, exportAnalytics] = useMutation(
    EXPORT_TENANT_ANALYTICS_MUTATION
  );

  const handleExport = async () => {
    const result = await exportAnalytics({ period, format: 'CSV' });
    if (result.data?.exportTenantAnalytics) {
      window.open(result.data.exportTenantAnalytics as string, '_blank');
    }
  };

  return (
    <button
      onClick={() => void handleExport()}
      disabled={fetching}
      aria-label="Export analytics as CSV"
      className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      {fetching ? 'Exporting…' : 'Export CSV'}
    </button>
  );
}
