/**
 * PendingInvitesTable — Extracted from TeamManagement.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
}

interface PendingInvitesTableProps {
  invites: Invite[];
  fetching: boolean;
  t: (key: string) => string;
}

export function PendingInvitesTable({
  invites,
  fetching,
  t,
}: PendingInvitesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('team.pendingTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {fetching ? (
          <p className="text-sm text-muted-foreground">{t('team.loading')}</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('team.noInvites')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('team.colEmail')}</TableHead>
                <TableHead>{t('team.colRole')}</TableHead>
                <TableHead>{t('team.colStatus')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.email}</TableCell>
                  <TableCell>{inv.role}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{inv.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
