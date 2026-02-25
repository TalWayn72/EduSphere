/**
 * RoleManagementPage.tsx
 * Roles & permissions management — role list sidebar + detail panel.
 * Route: /admin/roles
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Plus, Lock } from 'lucide-react';
import { useAuthRole } from '@/hooks/useAuthRole';
import { SYSTEM_ROLES, RoleRecord } from '@/lib/graphql/admin-roles.permissions';
import { RoleDetailPanel } from './RoleManagementPage.detail';
import { RoleFormModal } from './RoleManagementPage.modal';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

type SaveValues = { name: string; description?: string; permissions: string[] };

export function RoleManagementPage() {
  const navigate = useNavigate();
  const authRole = useAuthRole();
  const [roles, setRoles] = useState<RoleRecord[]>(SYSTEM_ROLES);
  const [selectedId, setSelectedId] = useState<string>(SYSTEM_ROLES[0]!.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<RoleRecord> | undefined>();

  if (!authRole || !ADMIN_ROLES.has(authRole)) {
    navigate('/dashboard');
    return null;
  }

  const selectedRole = roles.find(r => r.id === selectedId) ?? roles[0]!;

  function openCreateModal() { setEditingRole(undefined); setModalOpen(true); }

  function handleDuplicate(role: RoleRecord) {
    setEditingRole({ name: `Custom: ${role.name}`, description: `Copy of ${role.name}`, permissions: [...role.permissions] });
    setModalOpen(true);
  }

  function handleEdit(role: RoleRecord) { setEditingRole(role); setModalOpen(true); }

  function handleDelete(role: RoleRecord) {
    setRoles(prev => prev.filter(r => r.id !== role.id));
    if (selectedId === role.id) setSelectedId(SYSTEM_ROLES[0]!.id);
    toast.success(`Role "${role.name}" deleted.`);
  }

  function handleSave(values: SaveValues) {
    if (editingRole?.id) {
      setRoles(prev =>
        prev.map(r =>
          r.id === editingRole.id
            ? { ...r, ...values, description: values.description ?? '' }
            : r,
        ),
      );
      toast.success(`Role "${values.name}" updated.`);
    } else {
      const newRole: RoleRecord = {
        id: `custom-${Date.now()}`,
        name: values.name,
        description: values.description ?? '',
        isSystem: false,
        userCount: 0,
        permissions: values.permissions,
      };
      setRoles(prev => [...prev, newRole]);
      setSelectedId(newRole.id);
      toast.success(`Role "${values.name}" created.`);
    }
    setModalOpen(false);
  }

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
            {roles.map(role => (
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
                <Badge variant={selectedId === role.id ? 'outline' : 'secondary'} className="ml-1 text-xs">
                  {role.userCount}
                </Badge>
              </button>
            ))}
          </ScrollArea>
          <Separator />
          <p className="text-xs text-muted-foreground px-1">
            {roles.filter(r => !r.isSystem).length} custom role(s)
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
