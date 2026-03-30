/**
 * UserTableRow — table row for a single user with role selector and actions.
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import type { AdminUser, UserRole } from './user-management.types';
import { ROLE_BADGE } from './user-management.types';

interface UserTableRowProps {
  user: AdminUser;
  editingRole: Record<string, string>;
  confirmDeactivate: string | null;
  confirmRoleChange: { userId: string; newRole: string } | null;
  onRoleChange: (userId: string, newRole: string) => void;
  onConfirmRoleChange: () => void;
  onCancelRoleChange: () => void;
  onResetPassword: (userId: string) => void;
  onDeactivate: (userId: string) => void;
  onConfirmDeactivate: (userId: string) => void;
}

export function UserTableRow({
  user: u,
  editingRole,
  confirmDeactivate,
  confirmRoleChange,
  onRoleChange,
  onConfirmRoleChange,
  onCancelRoleChange,
  onResetPassword,
  onDeactivate,
  onConfirmDeactivate,
}: UserTableRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {u.firstName} {u.lastName}
      </TableCell>
      <TableCell>{u.email}</TableCell>
      <TableCell>
        {confirmRoleChange?.userId === u.id ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              &rarr; {confirmRoleChange.newRole}?
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-2 text-xs"
              onClick={() => void onConfirmRoleChange()}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={onCancelRoleChange}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Select
            value={editingRole[u.id] ?? u.role}
            onValueChange={(v) => onRoleChange(u.id, v)}
          >
            <SelectTrigger className="w-36 h-7 text-xs">
              <Badge
                className={
                  ROLE_BADGE[(editingRole[u.id] as UserRole) ?? u.role]
                }
              >
                {editingRole[u.id] ?? u.role}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_BADGE) as UserRole[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(u.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => void onResetPassword(u.id)}
          >
            Reset Pw
          </Button>
          {confirmDeactivate === u.id ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-2 text-xs"
              onClick={() => void onDeactivate(u.id)}
            >
              Confirm
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-red-600 dark:text-red-400"
              onClick={() => onConfirmDeactivate(u.id)}
            >
              Deactivate
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
