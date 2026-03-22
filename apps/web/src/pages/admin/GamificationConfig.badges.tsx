/**
 * GamificationBadgeForm + BadgeTable — org badge CRUD with auto-award editor (F-12).
 */
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2 } from 'lucide-react';
import {
  BadgeAutoAwardEditor,
  type AutoAwardCriteria,
} from './BadgeAutoAwardEditor';

// ── GraphQL Mutations ────────────────────────────────────────────────────────

const CREATE_BADGE_MUTATION = `
  mutation CreateOrgBadge($input: CreateOrgBadgeInput!) {
    createOrgBadge(input: $input) {
      id name description iconUrl xpRequired autoAwardCriteria isActive createdAt
    }
  }
`;

const UPDATE_BADGE_MUTATION = `
  mutation UpdateOrgBadge($id: ID!, $input: UpdateOrgBadgeInput!) {
    updateOrgBadge(id: $id, input: $input) {
      id name description iconUrl xpRequired autoAwardCriteria isActive createdAt
    }
  }
`;

const DELETE_BADGE_MUTATION = `
  mutation DeleteOrgBadge($id: ID!) {
    deleteOrgBadge(id: $id)
  }
`;

// ── Types & Validation ───────────────────────────────────────────────────────

const badgeSchema = z.object({
  name: z.string().min(2, 'Badge name is required').max(200),
  description: z.string().max(1000).optional(),
  xpRequired: z.number().int().min(0),
  iconUrl: z.string().url().optional().or(z.literal('')),
});

type BadgeFormData = z.infer<typeof badgeSchema>;

export interface BadgeData {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  xpRequired: number;
  autoAwardCriteria?: AutoAwardCriteria | null;
  isActive?: boolean;
}

// ── Badge Form ───────────────────────────────────────────────────────────────

interface BadgeFormProps {
  t: (key: string) => string;
  editingBadge?: BadgeData | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function GamificationBadgeForm({
  t,
  editingBadge,
  onSaved,
  onCancel,
}: BadgeFormProps) {
  const [, createBadge] = useMutation(CREATE_BADGE_MUTATION);
  const [, updateBadge] = useMutation(UPDATE_BADGE_MUTATION);
  const [criteria, setCriteria] = useState<AutoAwardCriteria | null>(
    editingBadge?.autoAwardCriteria ?? null
  );

  const form = useForm<BadgeFormData>({
    resolver: zodResolver(badgeSchema),
    defaultValues: editingBadge
      ? {
          name: editingBadge.name,
          description: editingBadge.description,
          xpRequired: editingBadge.xpRequired,
          iconUrl: editingBadge.iconUrl,
        }
      : { xpRequired: 100 },
  });

  const onSubmit = async (d: BadgeFormData) => {
    const input = {
      ...d,
      iconUrl: d.iconUrl || undefined,
      autoAwardCriteria: criteria,
    };

    if (editingBadge) {
      await updateBadge({ id: editingBadge.id, input });
    } else {
      await createBadge({ input });
    }
    form.reset();
    setCriteria(null);
    onSaved?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {editingBadge
            ? t('gamification.editBadge')
            : t('gamification.createBadge')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="badge-name">{t('gamification.badgeName')}</Label>
              <Input
                id="badge-name"
                {...form.register('name')}
                placeholder={t('gamification.badgeNamePlaceholder')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="badge-desc">
                {t('gamification.badgeDescription')}
              </Label>
              <Input id="badge-desc" {...form.register('description')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="badge-xp">{t('gamification.xpRequired')}</Label>
              <Input
                id="badge-xp"
                type="number"
                {...form.register('xpRequired', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="badge-icon">{t('gamification.iconUrl')}</Label>
              <Input
                id="badge-icon"
                {...form.register('iconUrl')}
                placeholder="https://..."
              />
            </div>
          </div>

          <BadgeAutoAwardEditor
            value={criteria}
            onChange={setCriteria}
            t={t}
          />

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {editingBadge
                ? t('gamification.updateBadge')
                : t('gamification.addBadge')}
            </Button>
            {editingBadge && onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Badge Table ──────────────────────────────────────────────────────────────

interface BadgeTableProps {
  badges: BadgeData[];
  t: (key: string) => string;
  onEdit?: (badge: BadgeData) => void;
  onRefresh?: () => void;
}

export function GamificationBadgeTable({
  badges,
  t,
  onEdit,
  onRefresh,
}: BadgeTableProps) {
  const [, deleteBadge] = useMutation(DELETE_BADGE_MUTATION);

  if (badges.length === 0) return null;

  const handleDelete = async (id: string) => {
    await deleteBadge({ id });
    onRefresh?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('gamification.badgesTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('gamification.colName')}</TableHead>
              <TableHead>{t('gamification.colDescription')}</TableHead>
              <TableHead>{t('gamification.colXp')}</TableHead>
              <TableHead>{t('gamification.colCriteria')}</TableHead>
              <TableHead className="w-24">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {badges.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {b.iconUrl && (
                      <img
                        src={b.iconUrl}
                        alt=""
                        className="h-5 w-5 rounded"
                      />
                    )}
                    <span className="font-medium">{b.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {b.description}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{b.xpRequired} XP</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {b.autoAwardCriteria?.type ?? '-'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit?.(b)}
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(b.id)}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
