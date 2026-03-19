/**
 * AdminUserManagementPage — User list with search, role filter, bulk actions.
 * Route: /admin/user-management
 */
import React, { useState, useEffect, useCallback } from 'react';
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
import { UserTableRow } from './AdminUserManagementPage.row';

const USERS_QUERY = `
  query AdminUsers($search: String, $role: String, $page: Int) {
    adminUsers(search: $search, role: $role, page: $page) {
      nodes { id name email role status lastLogin }
      totalCount
      pageInfo { hasNextPage hasPreviousPage }
    }
  }
`;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string | null;
}

const ROLES = ['ALL', 'STUDENT', 'INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN', 'RESEARCHER'];

export function AdminUserManagementPage() {
  const { t } = useTranslation('admin');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery<{
    adminUsers: { nodes: AdminUser[]; totalCount: number; pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean } };
  }>({
    query: USERS_QUERY,
    variables: { search: search || undefined, role: roleFilter === 'ALL' ? undefined : roleFilter, page },
    pause: !mounted,
  });

  const { data, fetching, error } = result;
  const users = data?.adminUsers?.nodes ?? [];

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  return (
    <AdminLayout title={t('users.title')} description={t('users.description')}>
      <div data-testid="admin-user-management-page" className="space-y-4">
        <Badge variant="outline" className="border-yellow-400 text-yellow-700">BETA</Badge>

        <div className="flex gap-3 items-center">
          <Input
            data-testid="user-search-input"
            placeholder={t('users.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-sm"
          />
          <select
            data-testid="role-filter-select"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {selected.size > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" data-testid="bulk-enroll-btn">
                {t('users.enroll', { count: selected.size })}
              </Button>
              <Button size="sm" variant="destructive" data-testid="bulk-deactivate-btn">
                {t('users.deactivate', { count: selected.size })}
              </Button>
            </div>
          )}
        </div>

        {fetching && (
          <div data-testid="user-table-skeleton" className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        )}

        {error && !fetching && (
          <Card><CardContent className="py-8 text-center text-destructive text-sm">
            {t('users.loadError')}
          </CardContent></Card>
        )}

        {!fetching && !error && (
          <Card>
            <CardHeader><CardTitle>{t('users.usersCount', { count: data?.adminUsers?.totalCount ?? 0 })}</CardTitle></CardHeader>
            <CardContent>
              <Table data-testid="user-management-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>{t('users.colName')}</TableHead>
                    <TableHead>{t('users.colEmail')}</TableHead>
                    <TableHead>{t('users.colRole')}</TableHead>
                    <TableHead>{t('users.colStatus')}</TableHead>
                    <TableHead>{t('users.colLastLogin')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <UserTableRow
                      key={u.id}
                      user={u}
                      selected={selected.has(u.id)}
                      onToggle={toggleSelect}
                    />
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t('users.noUsers')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between mt-4">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {t('users.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">{t('users.page', { page })}</span>
                <Button size="sm" variant="outline" disabled={!data?.adminUsers?.pageInfo?.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                  {t('users.next')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
