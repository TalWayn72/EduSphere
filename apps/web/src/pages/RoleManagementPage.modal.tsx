/**
 * RoleManagementPage.modal.tsx
 * Create / edit custom role dialog.
 */
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PERMISSION_GROUPS, RoleRecord } from '@/lib/graphql/admin-roles.permissions';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(64),
  description: z.string().max(200).optional(),
  permissions: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  open: boolean;
  initialRole?: Partial<RoleRecord>;
  onClose: () => void;
  onSave: (values: FormValues) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoleFormModal({ open, initialRole, onClose, onSave }: Props) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema as any),
      defaultValues: {
        name: initialRole?.name ?? '',
        description: initialRole?.description ?? '',
        permissions: initialRole?.permissions ?? [],
      },
    });

  const selected = watch('permissions');

  function togglePermission(key: string) {
    setValue(
      'permissions',
      selected.includes(key) ? selected.filter(p => p !== key) : [...selected, key],
      { shouldValidate: true },
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initialRole?.id ? 'Edit Custom Role' : 'Create Custom Role'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} id="role-form">
          <div className="space-y-4 mb-4">
            <div className="space-y-1">
              <Label htmlFor="role-name">Role name</Label>
              <Input id="role-name" {...register('name')} placeholder="e.g. Content Manager" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="role-desc">Description</Label>
              <Input
                id="role-desc"
                {...register('description')}
                placeholder="Brief description of this role"
              />
            </div>
          </div>

          <Separator className="my-3" />

          <p className="text-sm font-medium mb-2">Permissions</p>
          <ScrollArea className="h-72 pr-3">
            <div className="space-y-4">
              {PERMISSION_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {group.permissions.map(perm => (
                      <label
                        key={perm.key}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={selected.includes(perm.key)}
                          onCheckedChange={() => togglePermission(perm.key)}
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </form>

        <DialogFooter className="mt-4">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="role-form">Save role</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
