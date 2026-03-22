/**
 * GamificationBadgeForm + BadgeTable — extracted from GamificationConfig.
 */
import React from 'react';
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

const CREATE_BADGE_MUTATION = `
  mutation CreateOrgBadge($input: CreateBadgeInput!) {
    createOrgBadge(input: $input) { id name }
  }
`;

const badgeSchema = z.object({
  name: z.string().min(2, 'Badge name is required').max(100),
  description: z.string().max(500).optional(),
  xpRequired: z.number().int().min(0),
  iconUrl: z.string().url().optional().or(z.literal('')),
});

type BadgeForm = z.infer<typeof badgeSchema>;

export interface BadgeData {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  xpRequired: number;
}

interface BadgeFormProps {
  t: (key: string) => string;
}

export function GamificationBadgeForm({ t }: BadgeFormProps) {
  const [, createBadge] = useMutation(CREATE_BADGE_MUTATION);
  const form = useForm<BadgeForm>({
    resolver: zodResolver(badgeSchema),
    defaultValues: { xpRequired: 100 },
  });

  const onCreateBadge = async (d: BadgeForm) => {
    await createBadge({ input: { ...d, iconUrl: d.iconUrl || undefined } });
    form.reset();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{t('gamification.createBadge')}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onCreateBadge)} className="grid gap-3 sm:grid-cols-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="badge-name">{t('gamification.badgeName')}</Label>
            <Input id="badge-name" {...form.register('name')} placeholder={t('gamification.badgeNamePlaceholder')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="badge-desc">{t('gamification.badgeDescription')}</Label>
            <Input id="badge-desc" {...form.register('description')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="badge-xp">{t('gamification.xpRequired')}</Label>
            <Input id="badge-xp" type="number" {...form.register('xpRequired', { valueAsNumber: true })} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">{t('gamification.addBadge')}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface BadgeTableProps {
  badges: BadgeData[];
  t: (key: string) => string;
}

export function GamificationBadgeTable({ badges, t }: BadgeTableProps) {
  if (badges.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{t('gamification.badgesTitle')}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('gamification.colName')}</TableHead>
              <TableHead>{t('gamification.colDescription')}</TableHead>
              <TableHead>{t('gamification.colXp')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {badges.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {b.iconUrl && <img src={b.iconUrl} alt="" className="h-5 w-5 rounded" />}
                    <span className="font-medium">{b.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.description}</TableCell>
                <TableCell><Badge variant="secondary">{b.xpRequired} XP</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
