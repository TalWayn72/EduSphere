/**
 * TeamManagement — Invite users + CSV import.
 * Route: /admin/team
 */
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PendingInvitesTable } from './TeamManagement.invites';

const INVITE_MUTATION = `
  mutation InviteUser($input: InviteUserInput!) {
    inviteUser(input: $input) { id email status }
  }
`;
const INVITES_QUERY = `
  query PendingInvites { pendingInvites { id email role status createdAt } }
`;

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['STUDENT', 'INSTRUCTOR', 'ORG_ADMIN']),
});
type InviteForm = z.infer<typeof inviteSchema>;

export function TeamManagement() {
  const { t } = useTranslation('orgAdmin');
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [, invite] = useMutation(INVITE_MUTATION);
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const [{ data, fetching }] = useQuery({
    query: INVITES_QUERY,
    pause: !mounted,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  });

  const onInvite = async (form: InviteForm) => {
    await invite({ input: form });
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvStatus(t('team.csvProcessing'));
    const reader = new FileReader();
    reader.onload = () => setCsvStatus(t('team.csvUploaded'));
    reader.readAsText(file);
  };

  const invites = (data?.pendingInvites ?? []) as Array<{
    id: string;
    email: string;
    role: string;
    status: string;
  }>;

  return (
    <AdminLayout title={t('team.title')} description={t('team.description')}>
      <div data-testid="team-management-page" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('team.inviteTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(onInvite)}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="invite-email">{t('team.emailLabel')}</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    {...register('email')}
                    placeholder={t('team.emailPlaceholder')}
                    aria-required="true"
                  />
                  {errors.email && (
                    <p className="text-destructive text-xs" role="alert">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">{t('team.roleLabel')}</Label>
                  <Select
                    onValueChange={(v) =>
                      setValue('role', v as InviteForm['role'])
                    }
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue placeholder={t('team.rolePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">
                        {t('team.roles.student')}
                      </SelectItem>
                      <SelectItem value="INSTRUCTOR">
                        {t('team.roles.instructor')}
                      </SelectItem>
                      <SelectItem value="ORG_ADMIN">
                        {t('team.roles.orgAdmin')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit">{t('team.sendInvite')}</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('team.csvTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('team.csvDescription')}
              </p>
              <Input
                ref={csvRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                aria-label={t('team.csvLabel')}
              />
              {csvStatus && (
                <p className="text-sm text-muted-foreground" role="status">
                  {csvStatus}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <PendingInvitesTable invites={invites} fetching={fetching} t={t} />
      </div>
    </AdminLayout>
  );
}
