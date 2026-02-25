/**
 * AnnouncementsPage.form — Create/edit announcement form section.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface AnnouncementFormValues {
  title: string;
  body: string;
  priority: string;
  targetAudience: string;
  publishAt: string;
  expiresAt: string;
}

interface Props {
  values: AnnouncementFormValues;
  onChange: (values: AnnouncementFormValues) => void;
  onSubmit: () => void;
  submitting: boolean;
  onCancel?: () => void;
}

const PRIORITIES = ['INFO', 'WARNING', 'CRITICAL'] as const;
const AUDIENCES = ['ALL', 'ADMINS', 'STUDENTS', 'INSTRUCTORS'] as const;

export function AnnouncementForm({ values, onChange, onSubmit, submitting, onCancel }: Props) {
  const set = (key: keyof AnnouncementFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => onChange({ ...values, [key]: e.target.value });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New Announcement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="ann-title">Title</Label>
          <Input id="ann-title" value={values.title} onChange={set('title')} placeholder="Announcement title" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ann-body">Body</Label>
          <textarea
            id="ann-body"
            value={values.body}
            onChange={set('body')}
            rows={4}
            placeholder="Message body..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="ann-priority">Priority</Label>
            <select id="ann-priority" value={values.priority} onChange={set('priority')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ann-audience">Target Audience</Label>
            <select id="ann-audience" value={values.targetAudience} onChange={set('targetAudience')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ann-publish">Publish At</Label>
            <Input id="ann-publish" type="datetime-local" value={values.publishAt} onChange={set('publishAt')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ann-expires">Expires At</Label>
            <Input id="ann-expires" type="datetime-local" value={values.expiresAt} onChange={set('expiresAt')} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          {onCancel && <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>}
          <Button onClick={onSubmit} disabled={submitting || !values.title.trim()}>
            {submitting ? 'Creating...' : 'Create Announcement'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
