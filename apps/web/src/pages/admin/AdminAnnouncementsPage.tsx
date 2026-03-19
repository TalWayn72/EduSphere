/**
 * AdminAnnouncementsPage — Create/edit/preview announcements.
 * Route: /admin/announcements-editor
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnnouncementPreview } from './AdminAnnouncementsPage.preview';

const TARGET_ROLES = ['ALL', 'STUDENT', 'INSTRUCTOR', 'ORG_ADMIN', 'RESEARCHER'] as const;

export interface AnnouncementFormData {
  title: string;
  body: string;
  scheduleDate: string;
  targetRoles: string[];
}

export function AdminAnnouncementsPage() {
  const { t } = useTranslation('admin');
  const [showPreview, setShowPreview] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<AnnouncementFormData>({
    defaultValues: { title: '', body: '', scheduleDate: '', targetRoles: ['ALL'] },
  });

  const formValues = watch();

  const onSubmit = (_data: AnnouncementFormData) => {
    // Will connect to GraphQL mutation when backend is ready
  };

  return (
    <AdminLayout title={t('announcements.title')} description={t('announcements.description')}>
      <div data-testid="admin-announcements-page" className="space-y-4">
        <Badge variant="outline" className="border-yellow-400 text-yellow-700">BETA</Badge>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{t('announcements.create')}</CardTitle></CardHeader>
            <CardContent>
              <form data-testid="announcement-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('announcements.titleLabel')}</label>
                  <Input
                    data-testid="announcement-title"
                    placeholder={t('announcements.titlePlaceholder')}
                    {...register('title', { required: t('announcements.titleRequired') })}
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">{t('announcements.bodyLabel')}</label>
                  <textarea
                    data-testid="announcement-body"
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder={t('announcements.bodyPlaceholder')}
                    {...register('body', { required: t('announcements.bodyRequired') })}
                  />
                  {errors.body && (
                    <p className="text-xs text-destructive mt-1">{errors.body.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">{t('announcements.scheduleDate')}</label>
                  <Input
                    data-testid="announcement-schedule"
                    type="datetime-local"
                    {...register('scheduleDate')}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">{t('announcements.targetRoles')}</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {TARGET_ROLES.map((role) => (
                      <label key={role} className="flex items-center gap-1 text-sm">
                        <input type="checkbox" value={role} {...register('targetRoles')} />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" data-testid="announcement-submit">
                    {t('announcements.save')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="announcement-preview-btn"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? t('announcements.hidePreview') : t('announcements.showPreview')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {showPreview && <AnnouncementPreview data={formValues} />}
        </div>
      </div>
    </AdminLayout>
  );
}
