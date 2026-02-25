/**
 * GamificationSettingsPage — Configure badges, points, and leaderboards.
 * Route: /admin/gamification
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthRole } from '@/hooks/useAuthRole';
import { BadgeFormFields, type BadgeFormData } from '@/components/BadgeFormFields';
import {
  ADMIN_BADGES_QUERY, CREATE_BADGE_MUTATION,
  UPDATE_BADGE_MUTATION, DELETE_BADGE_MUTATION,
} from '@/lib/graphql/admin-gamification.queries';
import { Trash2, Pencil } from 'lucide-react';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);
const EMPTY_FORM: BadgeFormData = {
  name: '', description: '', iconEmoji: '', category: '', pointsReward: 0, conditionType: '', conditionValue: 0,
};
const POINT_REFERENCE = [
  { label: 'Course completion', points: 100 },
  { label: 'Quiz score >80%', points: 50 },
  { label: 'Collaboration activity', points: 25 },
  { label: 'Knowledge contribution', points: 75 },
];

interface BadgeRow {
  id: string; name: string; description: string; iconEmoji: string;
  category: string; pointsReward: number; conditionType: string; conditionValue: number;
}

interface AdminBadgesResult { adminBadges: BadgeRow[] }

export function GamificationSettingsPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<BadgeFormData>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BadgeFormData>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [result, refetch] = useQuery<AdminBadgesResult>({
    query: ADMIN_BADGES_QUERY,
    pause: !role || !ADMIN_ROLES.has(role),
  });
  const [, createBadge] = useMutation(CREATE_BADGE_MUTATION);
  const [, updateBadge] = useMutation(UPDATE_BADGE_MUTATION);
  const [, deleteBadge] = useMutation(DELETE_BADGE_MUTATION);

  if (!role || !ADMIN_ROLES.has(role)) {
    void navigate('/dashboard');
    return null;
  }

  const badges = result.data?.adminBadges ?? [];

  const handleCreate = async () => {
    await createBadge({ input: createForm });
    setCreateForm(EMPTY_FORM);
    setShowCreate(false);
    refetch({ requestPolicy: 'network-only' });
  };

  const handleUpdate = async () => {
    if (!editId) return;
    await updateBadge({ id: editId, input: editForm });
    setEditId(null);
    refetch({ requestPolicy: 'network-only' });
  };

  const handleDelete = async (id: string) => {
    await deleteBadge({ id });
    setDeleteConfirm(null);
    refetch({ requestPolicy: 'network-only' });
  };

  return (
    <AdminLayout title="Gamification Settings" description="Configure badges, points, and leaderboards">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Badge Management</CardTitle>
            <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? 'Cancel' : 'Create Badge'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showCreate && (
              <BadgeFormFields
                value={createForm}
                onChange={setCreateForm}
                onSave={() => void handleCreate()}
                onCancel={() => { setShowCreate(false); setCreateForm(EMPTY_FORM); }}
                saveLabel="Create"
              />
            )}
            {result.fetching && <p className="text-sm text-muted-foreground">Loading badges...</p>}
            {badges.length === 0 && !result.fetching && (
              <p className="text-sm text-muted-foreground text-center py-4">No badges defined yet.</p>
            )}
            {badges.map((b) => (
              <div key={b.id}>
                {editId === b.id ? (
                  <BadgeFormFields
                    value={editForm}
                    onChange={setEditForm}
                    onSave={() => void handleUpdate()}
                    onCancel={() => setEditId(null)}
                    saveLabel="Update"
                  />
                ) : (
                  <div className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{b.iconEmoji}</span>
                      <div>
                        <p className="font-medium text-sm">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.description}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{b.category}</Badge>
                      <span className="text-xs text-muted-foreground">{b.pointsReward} pts</span>
                      <span className="text-xs text-muted-foreground">{b.conditionType} &ge; {b.conditionValue}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => { setEditId(b.id); setEditForm({ name: b.name, description: b.description, iconEmoji: b.iconEmoji, category: b.category, pointsReward: b.pointsReward, conditionType: b.conditionType, conditionValue: b.conditionValue }); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {deleteConfirm === b.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="destructive" onClick={() => void handleDelete(b.id)}>Confirm</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(b.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Points Reference</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {POINT_REFERENCE.map((item) => (
                <div key={item.label} className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{item.points}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
