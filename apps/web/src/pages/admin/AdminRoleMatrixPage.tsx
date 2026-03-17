/**
 * AdminRoleMatrixPage — Read-only permission matrix: roles vs permissions.
 * Route: /admin/role-matrix
 */
import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const ROLES = ['STUDENT', 'INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN', 'RESEARCHER'] as const;

const PERMISSIONS = [
  'course:read',
  'course:write',
  'course:delete',
  'user:read',
  'user:manage',
  'analytics:view',
  'analytics:export',
  'audit:view',
  'announcement:create',
  'settings:manage',
  'agent:execute',
  'billing:manage',
] as const;

type Role = (typeof ROLES)[number];
type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<Role, Set<Permission>> = {
  STUDENT: new Set(['course:read', 'agent:execute']),
  INSTRUCTOR: new Set(['course:read', 'course:write', 'analytics:view', 'announcement:create', 'agent:execute']),
  RESEARCHER: new Set(['course:read', 'analytics:view', 'analytics:export', 'agent:execute']),
  ORG_ADMIN: new Set([
    'course:read', 'course:write', 'course:delete', 'user:read', 'user:manage',
    'analytics:view', 'analytics:export', 'audit:view', 'announcement:create',
    'settings:manage', 'agent:execute',
  ]),
  SUPER_ADMIN: new Set(PERMISSIONS),
};

export function AdminRoleMatrixPage() {
  return (
    <AdminLayout title="Role Permission Matrix" description="Read-only view of role-based permissions">
      <div data-testid="admin-role-matrix-page" className="space-y-4">
        <Badge variant="outline" className="border-yellow-400 text-yellow-700">BETA</Badge>

        <Card>
          <CardHeader>
            <CardTitle>Roles vs Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid="role-matrix-grid" className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">Permission</TableHead>
                    {ROLES.map((role) => (
                      <TableHead key={role} className="text-center min-w-[100px]">
                        {role}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSIONS.map((perm) => (
                    <TableRow key={perm} data-testid={`matrix-row-${perm}`}>
                      <TableCell className="sticky left-0 bg-background font-mono text-xs">
                        {perm}
                      </TableCell>
                      {ROLES.map((role) => (
                        <TableCell key={role} className="text-center">
                          {MATRIX[role].has(perm) ? (
                            <span className="text-green-600 font-bold" aria-label="granted">&#10003;</span>
                          ) : (
                            <span className="text-muted-foreground" aria-label="denied">&mdash;</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
