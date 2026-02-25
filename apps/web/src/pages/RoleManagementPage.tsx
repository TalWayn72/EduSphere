/**
 * RoleManagementPage.tsx
 * Roles & permissions management — role list sidebar + detail panel.
 * Route: /admin/roles
 * Custom roles are persisted in DB via GraphQL (F-113).
 * System roles (SUPER_ADMIN, ORG_ADMIN, INSTRUCTOR, STUDENT) are read-only.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Plus, Lock } from 'lucide-react';
import { useAuthRole } from '@/hooks/useAuthRole';
import { SYSTEM_ROLES, RoleRecord } from '@/lib/graphql/admin-roles.permissions';
import {
  LIST_ROLES_QUERY,
  CREATE_ROLE_MUTATION,
  UPDATE_ROLE_MUTATION,
  DELETE_ROLE_MUTATION,
} from '@/lib/graphql/admin-roles.queries';
import { RoleDetailPanel } from './RoleManagementPage.detail';
import { RoleFormModal } from './RoleManagementPage.modal';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

type SaveValues = { name: string; description?: string; permissions: string[] };

interface BackendRole {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
  createdAt: string;
}

export function RoleManagementPage() {
  const navigate = useNavigate();
  const authRole = useAuthRole();
  const [selectedId, setSelectedId] = useState<string>(SYSTEM_ROLES[0]!.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<RoleRecord> | undefined>();

  const [rolesResult, reexecuteRoles] = useQuery<{ roles: BackendRole[] }>({
    query: LIST_ROLES_QUERY,
  });

  const [, createRole] = useMutation(CREATE_ROLE_MUTATION);
  const [, updateRole] = useMutation(UPDATE_ROLE_MUTATION);
  const [, deleteRole] = useMutation(DELETE_ROLE_MUTATION);

  if (!authRole || !ADMIN_ROLES.has(authRole)) {
    navigate('/dashboard');
    return null;
  }

  // Merge backend custom roles with static system roles
  const backendCustomRoles: RoleRecord[] = (rolesResult.data?.roles ?? [])
    .filter((r) => !r.isSystem)
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: false,
      userCount: r.userCount,
      permissions: r.permissions,
    }));

  const roles: RoleRecord[] = [...SYSTEM_ROLES, ...backendCustomRoles];
  const selectedRole = roles.find((r) => r.id === selectedId) ?? roles[0]!;

  function openCreateModal() { setEditingRole(undefined); setModalOpen(true); }

  function handleDuplicate(role: RoleRecord) {
    setEditingRole({
      name: `Custom: ${role.name}`,
      description: `Copy of ${role.name}`,
      permissions: [...role.permissions],
    });
    setModalOpen(true);
  }

  function handleEdit(role: RoleRecord) { setEditingRole(role); setModalOpen(true); }

  async function handleDelete(role: RoleRecord) {
    const result = await deleteRole({ id: role.id });
    if (result.error) {
      toast.error(`Failed to delete "${role.name}": ${result.error.message}`);
    } else {
      if (selectedId === role.id) setSelectedId(SYSTEM_ROLES[0]!.id);
      reexecuteRoles({ requestPolicy: 'network-only' });
      toast.success(`Role "${role.name}" deleted.`);
    }
  }

  async function handleSave(values: SaveValues) {
    if (editingRole?.id) {
      const result = await updateRole({
        id: editingRole.id,
        input: { name: values.name, description: values.description, permissions: values.permissions },
      });
      if (result.error) {
        toast.error(`Failed to update role: ${result.error.message}`);
        return;
      }
      reexecuteRoles({ requestPolicy: 'network-only' });
      toast.success(`Role "${values.name}" updated.`);
    } else {
      const result = await createRole({
        input: { name: values.name, description: values.description, permissions: values.permissions },
      });
      if (result.error) {
        toast.error(`Failed to create role: ${result.error.message}`);
        return;
      }
      const newId = (result.data as { createRole?: { id: string } })?.createRole?.id;
      reexecuteRoles({ requestPolicy: 'network-only' });
      if (newId) setSelectedId(newId);
      toast.success(`Role "${values.name}" created.`);
    }
    setModalOpen(false);
  }

  const customRoleCount = backendCustomRoles.length;

  return (
    <AdminLayout
      title="Roles & Permissions"
      description="Define roles and control access across the platform"
    >
      <div className="flex gap-4 h-[calc(100vh-160px)]">
        {/* Sidebar */}
        <aside className="w-64 flex-none flex flex-col gap-2">
          <Button size="sm" className="w-full" onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Custom Role
          </Button>
          <ScrollArea className="flex-1 border rounded-lg p-1">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedId(role.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors
                  ${selectedId === role.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                <span className="flex items-center gap-1.5 font-medium truncate">
                  {role.isSystem
                    ? <Lock className="h-3.5 w-3.5 flex-none opacity-60" />
                    : <ShieldCheck className="h-3.5 w-3.5 flex-none opacity-60" />}
                  {role.name}
                </span>
                <Badge
                  variant={selectedId === role.id ? 'outline' : 'secondary'}
                  className="ml-1 text-xs"
                >
                  {role.userCount}
                </Badge>
              </button>
            ))}
            {rolesResult.fetching && (
              <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>
            )}
          </ScrollArea>
          <Separator />
          <p className="text-xs text-muted-foreground px-1">
            {customRoleCount} custom role{customRoleCount !== 1 ? 's' : ''}
          </p>
        </aside>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          <RoleDetailPanel
            role={selectedRole}
            onDuplicate={handleDuplicate}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <RoleFormModal
        open={modalOpen}
        initialRole={editingRole}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </AdminLayout>
  );
}
