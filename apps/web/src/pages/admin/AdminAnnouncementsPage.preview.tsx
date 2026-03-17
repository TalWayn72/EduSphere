/**
 * AnnouncementPreview — Live preview of announcement form data.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AnnouncementFormData } from './AdminAnnouncementsPage';

interface AnnouncementPreviewProps {
  data: AnnouncementFormData;
}

export function AnnouncementPreview({ data }: AnnouncementPreviewProps) {
  return (
    <Card data-testid="announcement-preview">
      <CardHeader>
        <CardTitle className="text-lg">Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <h3 className="text-xl font-bold" data-testid="preview-title">
          {data.title || 'Untitled Announcement'}
        </h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="preview-body">
          {data.body || 'No content yet...'}
        </p>
        {data.scheduleDate && (
          <p className="text-xs text-muted-foreground">
            Scheduled: {new Date(data.scheduleDate).toLocaleString()}
          </p>
        )}
        <div className="flex gap-1 flex-wrap">
          {(data.targetRoles ?? []).map((role) => (
            <Badge key={role} variant="secondary" className="text-xs">
              {role}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
