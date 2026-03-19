/**
 * AdminAuditLogPage — Audit log viewer with date range and user filters.
 * Route: /admin/audit-viewer
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const AUDIT_LOG_QUERY = `
  query AuditLogs($from: String, $to: String, $userId: String, $page: Int) {
    auditLogs(from: $from, to: $to, userId: $userId, page: $page) {
      nodes { id timestamp user action target details }
      totalCount
    }
  }
`;

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  details: string;
}

export function AdminAuditLogPage() {
  const { t } = useTranslation('admin');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery<{
    auditLogs: { nodes: AuditEntry[]; totalCount: number };
  }>({
    query: AUDIT_LOG_QUERY,
    variables: {
      from: dateFrom || undefined,
      to: dateTo || undefined,
      userId: userFilter || undefined,
      page,
    },
    pause: !mounted,
  });

  const { data, fetching, error } = result;
  const entries = data?.auditLogs?.nodes ?? [];

  return (
    <AdminLayout title={t('audit.title')} description={t('audit.description')}>
      <div data-testid="admin-audit-log-page" className="space-y-4">
        <Badge variant="outline" className="border-yellow-400 text-yellow-700">BETA</Badge>

        <div className="flex gap-3 items-end flex-wrap" data-testid="audit-date-filter">
          <div>
            <label className="text-xs text-muted-foreground">{t('audit.from')}</label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('audit.to')}</label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('audit.user')}</label>
            <Input
              data-testid="audit-user-filter"
              placeholder={t('audit.filterByUser')}
              value={userFilter}
              onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
              className="w-48"
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => { setDateFrom(''); setDateTo(''); setUserFilter(''); setPage(1); }}>
            {t('audit.clear')}
          </Button>
        </div>

        {fetching && (
          <div data-testid="audit-log-skeleton" className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}

        {error && !fetching && (
          <Card><CardContent className="py-8 text-center text-destructive text-sm">
            {t('audit.loadError')}
          </CardContent></Card>
        )}

        {!fetching && !error && (
          <Card>
            <CardHeader><CardTitle>{t('audit.entriesCount', { count: data?.auditLogs?.totalCount ?? 0 })}</CardTitle></CardHeader>
            <CardContent>
              <Table data-testid="audit-log-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('audit.colTimestamp')}</TableHead>
                    <TableHead>{t('audit.colUser')}</TableHead>
                    <TableHead>{t('audit.colAction')}</TableHead>
                    <TableHead>{t('audit.colTarget')}</TableHead>
                    <TableHead>{t('audit.colDetails')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id} data-testid={`audit-row-${e.id}`}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(e.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{e.user}</TableCell>
                      <TableCell><Badge variant="outline">{e.action}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{e.target}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {e.details}
                      </TableCell>
                    </TableRow>
                  ))}
                  {entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t('audit.noEntries')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between mt-4">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {t('audit.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">{t('audit.page', { page })}</span>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)}>
                  {t('audit.next')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
