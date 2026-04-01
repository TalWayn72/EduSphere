/**
 * UserManagementPage — admin page for managing users, roles, and access.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthRole } from '@/hooks/useAuthRole';
import { InviteUserModal, BulkImportModal } from '../UserManagementPage.modals';
import { UserTableRow } from './UserTableRow';
import {
  ADMIN_ROLES,
  PAGE_SIZE,
  ADMIN_USERS,
  DEACTIVATE_USER,
  RESET_PASSWORD,
  UPDATE_USER,
  type UserRole,
  type AdminUser,
} from './user-management.types';

export function UserManagementPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedRole, setAppliedRole] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingRole, setEditingRole] = useState<Record<string, string>>({});
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(
    null
  );
  const [confirmRoleChange, setConfirmRoleChange] = useState<{
    userId: string;
    newRole: string;
  } | null>(null);

  const [, deactivateUser] = useMutation(DEACTIVATE_USER);
  const [, resetPassword] = useMutation(RESET_PASSWORD);
  const [, updateUser] = useMutation(UPDATE_USER);

  useEffect(() => {
    if (!role || !ADMIN_ROLES.has(role)) void navigate('/dashboard');
  }, [role, navigate]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }, refetch] = useQuery({
    query: ADMIN_USERS,
    variables: {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      search: appliedSearch || undefined,
      role: (appliedRole === 'all' ? undefined : appliedRole) as
        | UserRole
        | undefined,
    },
    pause: !mounted,
  });

  if (!role || !ADMIN_ROLES.has(role)) return null;

  const users: AdminUser[] = (data?.adminUsers?.users ?? []) as AdminUser[];
  const total: number = (data?.adminUsers?.total ?? 0) as number;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleApply = () => {
    setAppliedSearch(search);
    setAppliedRole(roleFilter);
    setPage(0);
  };

  const handleDeactivate = async (id: string) => {
    const result = await deactivateUser({ id });
    setConfirmDeactivate(null);
    if (result.error) {
      toast.error('Failed to deactivate user');
    } else {
      toast.success('User deactivated');
      refetch({ requestPolicy: 'network-only' });
    }
  };

  const handleResetPassword = async (userId: string) => {
    const result = await resetPassword({ userId });
    if (result.error) {
      toast.error('Failed to send password reset');
    } else {
      toast.success('Password reset email sent');
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!confirmRoleChange) return;
    const { userId, newRole } = confirmRoleChange;
    setEditingRole((prev) => ({ ...prev, [userId]: newRole }));
    const result = await updateUser({ id: userId, input: { role: newRole } });
    setConfirmRoleChange(null);
    if (result.error) {
      setEditingRole((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      toast.error('Failed to update role');
    } else {
      toast.success('Role updated successfully');
      refetch({ requestPolicy: 'network-only' });
    }
  };

  const tenantId = getCurrentUser()?.tenantId ?? '';

  return (
    <AdminLayout>
      <PageShell size="xl">
        <PageHeader
          title="User Management"
          description="Manage users, roles, and access"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'User Management' },
          ]}
        />
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-48">
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply();
                }}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                <SelectItem value="RESEARCHER">Researcher</SelectItem>
                <SelectItem value="ORG_ADMIN">Org Admin</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleApply}>Apply</Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => setShowBulk(true)}>
                Bulk Import
              </Button>
              <Button onClick={() => setShowInvite(true)}>+ Invite User</Button>
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fetching && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
                {!fetching && users.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                )}
                {users.map((u) => (
                  <UserTableRow
                    key={u.id}
                    user={u}
                    editingRole={editingRole}
                    confirmDeactivate={confirmDeactivate}
                    confirmRoleChange={confirmRoleChange}
                    onRoleChange={(userId, newRole) =>
                      setConfirmRoleChange({ userId, newRole })
                    }
                    onConfirmRoleChange={() => void handleConfirmRoleChange()}
                    onCancelRoleChange={() => setConfirmRoleChange(null)}
                    onResetPassword={(userId) =>
                      void handleResetPassword(userId)
                    }
                    onDeactivate={(userId) => void handleDeactivate(userId)}
                    onConfirmDeactivate={(userId) =>
                      setConfirmDeactivate(userId)
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total: {total} users</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((prev) => prev - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-2">
                {page + 1} / {Math.max(1, totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
        <InviteUserModal
          open={showInvite}
          onClose={() => setShowInvite(false)}
          tenantId={tenantId}
          onSuccess={() => {
            refetch({ requestPolicy: 'network-only' });
          }}
        />
        <BulkImportModal
          open={showBulk}
          onClose={() => setShowBulk(false)}
          onSuccess={() => {
            refetch({ requestPolicy: 'network-only' });
          }}
        />
      </PageShell>
    </AdminLayout>
  );
}
