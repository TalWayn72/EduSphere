/**
 * AdminAnnouncementsPage — Create/edit/preview announcements.
 * Route: /admin/announcements-editor
 */
import React, { useState } from 'react';
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
  const [showPreview, setShowPreview] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<AnnouncementFormData>({
    defaultValues: { title: '', body: '', scheduleDate: '', targetRoles: ['ALL'] },
  });

  const formValues = watch();

  const onSubmit = (_data: AnnouncementFormData) => {
    // Will connect to GraphQL mutation when backend is ready
  };

  return (
    <AdminLayout title="Announcements Editor" description="Create and schedule platform announcements">
      <div data-testid="admin-announcements-page" className="space-y-4">
        <Badge variant="outline" className="border-yellow-400 text-yellow-700">BETA</Badge>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Create Announcement</CardTitle></CardHeader>
            <CardContent>
              <form data-testid="announcement-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    data-testid="announcement-title"
                    placeholder="Announcement title..."
                    {...register('title', { required: 'Title is required' })}
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Body</label>
                  <textarea
                    data-testid="announcement-body"
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Announcement body (rich text coming soon)..."
                    {...register('body', { required: 'Body is required' })}
                  />
                  {errors.body && (
                    <p className="text-xs text-destructive mt-1">{errors.body.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Schedule Date</label>
                  <Input
                    data-testid="announcement-schedule"
                    type="datetime-local"
                    {...register('scheduleDate')}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Target Roles</label>
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
                    Save Announcement
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="announcement-preview-btn"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
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
