/**
 * AnnouncementsPage — Platform-wide announcement management.
 * Route: /admin/announcements
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  AnnouncementForm,
  type AnnouncementFormValues,
} from './AnnouncementsPage.form';
import {
  ADMIN_ANNOUNCEMENTS_QUERY,
  CREATE_ANNOUNCEMENT_MUTATION,
  UPDATE_ANNOUNCEMENT_MUTATION,
  DELETE_ANNOUNCEMENT_MUTATION,
  PUBLISH_ANNOUNCEMENT_MUTATION,
} from '@/lib/graphql/announcements.queries';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

const PRIORITY_CLASSES: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-800',
  WARNING: 'bg-amber-100 text-amber-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const BLANK: AnnouncementFormValues = {
  title: '',
  body: '',
  priority: 'INFO',
  targetAudience: 'ALL',
  publishAt: '',
  expiresAt: '',
};

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: string;
  targetAudience: string;
  isActive: boolean;
  publishAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export function AnnouncementsPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AnnouncementFormValues>(BLANK);

  const [{ data, fetching }, refetch] = useQuery({
    query: ADMIN_ANNOUNCEMENTS_QUERY,
    variables: { limit: 20, offset: 0 },
  });
  const [{ fetching: creating }, execCreate] = useMutation(
    CREATE_ANNOUNCEMENT_MUTATION
  );
  const [, execUpdate] = useMutation(UPDATE_ANNOUNCEMENT_MUTATION);
  const [, execDelete] = useMutation(DELETE_ANNOUNCEMENT_MUTATION);
  const [, execPublish] = useMutation(PUBLISH_ANNOUNCEMENT_MUTATION);

  if (!role || !ADMIN_ROLES.has(role)) {
    void navigate('/dashboard');
    return null;
  }

  const items: Announcement[] = data?.adminAnnouncements?.announcements ?? [];

  const handleCreate = async () => {
    await execCreate({
      input: {
        title: form.title,
        body: form.body,
        priority: form.priority,
        targetAudience: form.targetAudience,
        publishAt: form.publishAt || null,
        expiresAt: form.expiresAt || null,
      },
    });
    setForm(BLANK);
    setShowForm(false);
    refetch({ requestPolicy: 'network-only' });
  };

  const handleToggle = async (item: Announcement) => {
    await execUpdate({ id: item.id, input: { isActive: !item.isActive } });
    refetch({ requestPolicy: 'network-only' });
  };

  const handleDelete = async (id: string) => {
    await execDelete({ id });
    refetch({ requestPolicy: 'network-only' });
  };

  const handlePublish = async (id: string) => {
    await execPublish({ id });
    refetch({ requestPolicy: 'network-only' });
  };

  return (
    <AdminLayout
      title="Announcements"
      description="Manage platform-wide announcements"
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : 'Create Announcement'}
          </Button>
        </div>

        {showForm && (
          <AnnouncementForm
            values={form}
            onChange={setForm}
            onSubmit={handleCreate}
            submitting={creating}
            onCancel={() => setShowForm(false)}
          />
        )}

        {fetching && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}

        {items.length === 0 && !fetching && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No announcements yet.
            </CardContent>
          </Card>
        )}

        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="py-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold">{item.title}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_CLASSES[item.priority] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {item.priority}
                    </span>
                    <Badge variant={item.isActive ? 'default' : 'secondary'}>
                      {item.isActive ? 'Active' : 'Draft'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.targetAudience}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.body}
                  </p>
                  {item.publishAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Publish: {new Date(item.publishAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {!item.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handlePublish(item.id)}
                    >
                      Publish
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleToggle(item)}
                  >
                    {item.isActive ? 'Unpublish' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void handleDelete(item.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
