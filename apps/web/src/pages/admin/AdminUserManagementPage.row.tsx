/**
 * UserTableRow — Single row in the user management table.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import type { AdminUser } from './AdminUserManagementPage';

interface UserTableRowProps {
  user: AdminUser;
  selected: boolean;
  onToggle: (id: string) => void;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
};

export function UserTableRow({ user, selected, onToggle }: UserTableRowProps) {
  return (
    <TableRow data-testid={`user-row-${user.id}`}>
      <TableCell>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(user.id)}
          aria-label={`Select ${user.name}`}
        />
      </TableCell>
      <TableCell className="font-medium">{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[user.status] ?? 'secondary'}>
          {user.status}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
      </TableCell>
    </TableRow>
  );
}
