/* eslint-disable edusphere-design-system/require-page-shell -- multi-section layout */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3 } from 'lucide-react';
import * as urql from 'urql';

const ANALYTICS_QUERY = `query NotificationDeliveryAnalytics($startDate: String!, $endDate: String!) {
  notificationDeliveryAnalytics(startDate: $startDate, endDate: $endDate) {
    totalSent totalDelivered totalFailed
    byChannel { channel sent delivered failed }
    byType { notificationType sent delivered failed }
  }
}`;

interface ChannelRow { channel: string; sent: number; delivered: number; failed: number }
interface TypeRow { notificationType: string; sent: number; delivered: number; failed: number }
interface Analytics {
  totalSent: number; totalDelivered: number; totalFailed: number;
  byChannel: ChannelRow[]; byType: TypeRow[];
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="grid">
        <thead>
          <tr>{headers.map((h) => <th key={h} className="text-left py-2 pr-4 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b">
              {row.map((cell, j) => <td key={j} className="py-2 pr-4">{typeof cell === 'number' ? cell.toLocaleString() : cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminNotificationAnalyticsPage() {
  const { t } = useTranslation('admin');
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);

  const [{ data, fetching }] = urql.useQuery({
    query: ANALYTICS_QUERY,
    variables: { startDate, endDate },
  });

  const analytics: Analytics | null = data?.notificationDeliveryAnalytics ?? null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-6 w-6" aria-hidden="true" />
        <h1 className="text-2xl font-bold">{t('notifications.analyticsTitle')}</h1>
      </div>

      <div className="flex items-end gap-4 mb-6">
        <div>
          <Label htmlFor="start-date">{t('notifications.startDate')}</Label>
          <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="end-date">{t('notifications.endDate')}</Label>
          <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {fetching ? <p>{t('notifications.loading')}</p> : analytics ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label={t('notifications.totalSent')} value={analytics.totalSent} />
            <StatCard label={t('notifications.totalDelivered')} value={analytics.totalDelivered} />
            <StatCard label={t('notifications.totalFailed')} value={analytics.totalFailed} />
          </div>
          <section>
            <h2 className="text-lg font-semibold mb-3">{t('notifications.byChannel')}</h2>
            <DataTable headers={[t('notifications.channel'), t('notifications.sent'), t('notifications.delivered'), t('notifications.failed')]}
              rows={analytics.byChannel.map((r) => [r.channel, r.sent, r.delivered, r.failed])} />
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3">{t('notifications.byType')}</h2>
            <DataTable headers={[t('notifications.type'), t('notifications.sent'), t('notifications.delivered'), t('notifications.failed')]}
              rows={analytics.byType.map((r) => [r.notificationType, r.sent, r.delivered, r.failed])} />
          </section>
        </div>
      ) : <p>{t('notifications.noData')}</p>}
    </div>
  );
}
