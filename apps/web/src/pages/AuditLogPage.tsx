/**
 * AuditLogPage — Admin action audit trail.
 * Route: /admin/audit
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthRole } from '@/hooks/useAuthRole';
import { ADMIN_AUDIT_LOG_QUERY } from '@/lib/graphql/audit.queries';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);
const PAGE_SIZE = 50;

interface AuditEntry {
  id: string;
  action: string;
  userId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  status: string;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogResult {
  adminAuditLog: { entries: AuditEntry[]; total: number };
}

export function AuditLogPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');

  const [result] = useQuery<AuditLogResult>({
    query: ADMIN_AUDIT_LOG_QUERY,
    variables: {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      action: actionFilter || undefined,
      since: since || undefined,
      until: until || undefined,
    },
    pause: true,
  });

  if (!role || !ADMIN_ROLES.has(role)) {
    void navigate('/dashboard');
    return null;
  }

  const entries = result.data?.adminAuditLog.entries ?? [];
  const total = result.data?.adminAuditLog.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminLayout
      title="Audit Log"
      description="Track all administrative actions and platform events"
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Input
                placeholder="Filter by action..."
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(0);
                }}
                className="w-56"
              />
              <Input
                type="date"
                value={since}
                onChange={(e) => {
                  setSince(e.target.value);
                  setPage(0);
                }}
                className="w-44"
                aria-label="Since date"
              />
              <Input
                type="date"
                value={until}
                onChange={(e) => {
                  setUntil(e.target.value);
                  setPage(0);
                }}
                className="w-44"
                aria-label="Until date"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setActionFilter('');
                  setSince('');
                  setUntil('');
                  setPage(0);
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {result.fetching && (
              <p className="p-6 text-sm text-muted-foreground">Loading...</p>
            )}
            {result.error && (
              <p className="p-6 text-sm text-destructive">
                Failed to load audit log.
              </p>
            )}
            {!result.fetching && entries.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground text-center">
                No audit entries found.
              </p>
            )}
            {entries.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Time</th>
                      <th className="px-4 py-3 text-left font-medium">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        User ID
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Resource
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">
                          {entry.action}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {entry.userId ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {entry.resourceType
                            ? `${entry.resourceType}${entry.resourceId ? ` #${entry.resourceId}` : ''}`
                            : '—'}
                        </td>
                        <td className="px-4 py-2">
                          <Badge
                            variant={
                              entry.status === 'SUCCESS'
                                ? 'default'
                                : 'destructive'
                            }
                            className="text-xs"
                          >
                            {entry.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {entry.ipAddress ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total} total entries — page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
