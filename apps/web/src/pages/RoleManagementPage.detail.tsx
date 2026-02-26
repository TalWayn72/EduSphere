/**
 * RoleManagementPage.detail.tsx
 * Permissions detail panel for a selected role.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Lock, Copy, Pencil, Trash2 } from 'lucide-react';
import {
  PERMISSION_GROUPS,
  RoleRecord,
} from '@/lib/graphql/admin-roles.permissions';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  role: RoleRecord;
  onDuplicate: (role: RoleRecord) => void;
  onEdit: (role: RoleRecord) => void;
  onDelete: (role: RoleRecord) => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 border-red-200',
  ORG_ADMIN: 'bg-orange-100 text-orange-700 border-orange-200',
  INSTRUCTOR: 'bg-blue-100 text-blue-700 border-blue-200',
  STUDENT: 'bg-green-100 text-green-700 border-green-200',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoleDetailPanel({
  role,
  onDuplicate,
  onEdit,
  onDelete,
}: Props) {
  const colorClass =
    ROLE_COLORS[role.name] ?? 'bg-muted text-muted-foreground border';

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {role.isSystem && (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              <span
                className={`px-2 py-0.5 rounded text-sm font-mono border ${colorClass}`}
              >
                {role.name}
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{role.description}</p>
          </div>
          <Badge variant="secondary">{role.userCount} users</Badge>
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => onDuplicate(role)}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Duplicate
          </Button>
          {!role.isSystem && (
            <>
              <Button size="sm" variant="outline" onClick={() => onEdit(role)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(role)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 pt-4 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Permission Matrix
          {role.isSystem && (
            <span className="ml-2 text-xs font-normal normal-case">
              (system role — read-only)
            </span>
          )}
        </p>
        <ScrollArea className="h-[calc(100vh-370px)]">
          <div className="space-y-5 pr-2">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-foreground mb-1.5">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-y-1.5">
                  {group.permissions.map((perm) => {
                    const has = role.permissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Checkbox
                          checked={has}
                          disabled={role.isSystem}
                          aria-label={perm.label}
                          className="cursor-default"
                        />
                        <span className={has ? 'text-foreground' : ''}>
                          {perm.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
