import { FileVideo, FileAudio, FileText, X, AlertCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FileUploadEntry } from './useMediaUpload';

function fileIcon(mime: string) {
  if (mime.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
  if (mime.startsWith('audio/')) return <FileAudio className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

interface MediaUploadEntriesProps {
  entries: FileUploadEntry[];
  onUpload: (index: number) => void;
  onRemove: (index: number) => void;
  onUpdateEntry: (index: number, patch: Partial<FileUploadEntry>) => void;
  t: (key: string) => string;
}

export function MediaUploadEntries({
  entries,
  onUpload,
  onRemove,
  onUpdateEntry,
  t,
}: MediaUploadEntriesProps) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            {fileIcon(entry.file.type)}
            <span className="flex-1 text-sm truncate">{entry.file.name}</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="p-1 rounded hover:bg-destructive/10 hover:text-destructive"
              aria-label={t('wizard.removeAriaLabel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`title-${i}`} className="text-xs">{t('wizard.displayTitle')}</Label>
            <Input
              id={`title-${i}`}
              value={entry.title}
              onChange={(e) => onUpdateEntry(i, { title: e.target.value })}
              disabled={entry.state !== 'idle'}
              className="h-8 text-sm"
            />
          </div>

          {entry.state !== 'idle' && entry.state !== 'error' && (
            <div className="space-y-1">
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${entry.state === 'done' ? 100 : entry.progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {entry.state === 'presigning' && t('wizard.preparingUpload')}
                {entry.state === 'uploading' && t('wizard.uploadingFile')}
                {entry.state === 'confirming' && t('wizard.confirming')}
                {entry.state === 'done' && t('wizard.uploadComplete')}
              </p>
            </div>
          )}

          {entry.state === 'error' && (
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{entry.error}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onUpdateEntry(i, { state: 'idle', progress: 0, error: undefined })}
              >
                {t('wizard.retryUpload')}
              </Button>
            </div>
          )}

          {entry.state === 'idle' && (
            <Button
              type="button"
              size="sm"
              onClick={() => onUpload(i)}
              disabled={!entry.title.trim()}
              className="w-full gap-1.5"
            >
              <Upload className="h-4 w-4" />
              {t('wizard.upload')}
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}
