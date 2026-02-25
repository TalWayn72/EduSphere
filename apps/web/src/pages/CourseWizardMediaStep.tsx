import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileVideo, FileAudio, FileText, X, CheckCircle2, AlertCircle, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { urqlClient } from '@/lib/urql-client';
import { PRESIGNED_UPLOAD_QUERY, CONFIRM_MEDIA_UPLOAD_MUTATION } from '@/lib/graphql/content.queries';
import type { UploadedMedia, CourseFormData } from './course-create.types';
import { AltTextModal } from '@/components/AltTextModal';
import { RichEditor } from '@/components/editor/RichEditor';
interface Props {
  courseId: string;
  mediaList: UploadedMedia[];
  onChange: (updates: Partial<CourseFormData>) => void;
}

type UploadState = 'idle' | 'presigning' | 'uploading' | 'confirming' | 'done' | 'error';

interface FileUploadEntry {
  file: File;
  title: string;
  state: UploadState;
  progress: number;
  error?: string;
  result?: UploadedMedia;
}

function fileIcon(mime: string) {
  if (mime.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
  if (mime.startsWith('audio/')) return <FileAudio className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

const ACCEPTED_TYPES = 'video/mp4,video/webm,audio/mpeg,audio/wav,application/pdf,image/jpeg,image/png';

export function CourseWizardMediaStep({ courseId, mediaList, onChange }: Props) {
  const { t } = useTranslation('courses');
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileUploadEntry[]>([]);
  const [altTextTarget, setAltTextTarget] = useState<{ mediaId: string; altText: string | null } | null>(null);
  const [richDocTitle, setRichDocTitle] = useState('');
  const [richDocContent, setRichDocContent] = useState('');
  const [richDocSaved, setRichDocSaved] = useState(false);

  const updateEntry = (index: number, patch: Partial<FileUploadEntry>) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newEntries: FileUploadEntry[] = files.map((f) => ({
      file: f,
      title: f.name.replace(/\.[^.]+$/, ''),
      state: 'idle',
      progress: 0,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
    e.target.value = '';
  };

  const uploadFile = async (index: number) => {
    const entry = entries[index];
    if (!entry || entry.state !== 'idle') return;

    // Step 1: Get presigned URL
    updateEntry(index, { state: 'presigning', progress: 0 });

    const presignResult = await urqlClient.query(PRESIGNED_UPLOAD_QUERY, {
      fileName: entry.file.name,
      contentType: entry.file.type,
      courseId,
    }).toPromise();

    if (presignResult.error || !presignResult.data?.getPresignedUploadUrl) {
      updateEntry(index, { state: 'error', error: t('wizard.failedUploadUrl') });
      return;
    }

    const { uploadUrl, fileKey } = presignResult.data.getPresignedUploadUrl as {
      uploadUrl: string;
      fileKey: string;
      expiresAt: string;
    };

    // Step 2: PUT file directly to MinIO
    updateEntry(index, { state: 'uploading', progress: 10 });

    try {
      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        body: entry.file,
        headers: { 'Content-Type': entry.file.type },
      });

      if (!uploadResp.ok) {
        updateEntry(index, { state: 'error', error: `Upload failed: ${uploadResp.statusText}` });
        return;
      }
    } catch {
      updateEntry(index, { state: 'error', error: t('wizard.networkError') });
      return;
    }

    updateEntry(index, { state: 'confirming', progress: 80 });

    // Step 3: Confirm upload via mutation
    const confirmResult = await urqlClient.mutation(CONFIRM_MEDIA_UPLOAD_MUTATION, {
      fileKey,
      courseId,
      title: entry.title,
    }).toPromise();

    if (confirmResult.error || !confirmResult.data?.confirmMediaUpload) {
      updateEntry(index, { state: 'error', error: t('wizard.failedConfirm') });
      return;
    }

    const asset = confirmResult.data.confirmMediaUpload as UploadedMedia;
    updateEntry(index, { state: 'done', progress: 100, result: asset });

    onChange({ mediaList: [...mediaList, asset] });
  };

  const removeEntry = (index: number) => {
    const entry = entries[index];
    if (entry?.result) {
      onChange({ mediaList: mediaList.filter((m) => m.id !== entry.result?.id) });
    }
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRichDoc = () => { if (!richDocTitle.trim()) return;
    const richEntry = { id: `rich-${Date.now()}`, courseId, fileKey: '', title: richDocTitle.trim(), contentType: 'RICH_DOCUMENT', status: 'READY' as const, downloadUrl: null, altText: null } as UploadedMedia;
    onChange({ mediaList: [...mediaList, richEntry] }); setRichDocSaved(true); setRichDocTitle(''); setRichDocContent(''); setTimeout(() => setRichDocSaved(false), 3000);
  };
  return (
    <div className="space-y-6">
      {/* Existing confirmed media */}
      {mediaList.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('wizard.uploadedFiles', { count: mediaList.length })}</p>
          {mediaList.map((m) => (
            <Card key={m.id} className="p-3 flex items-center gap-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <span className="flex-1 truncate font-medium">{m.title}</span>
              <span className="text-muted-foreground text-xs">{m.contentType}</span>
            </Card>
          ))}
        </div>
      )}

      {/* Pending upload entries */}
      {entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                {fileIcon(entry.file.type)}
                <span className="flex-1 text-sm truncate">{entry.file.name}</span>
                <button
                  type="button"
                  onClick={() => removeEntry(i)}
                  className="p-1 rounded hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`title-${i}`} className="text-xs">{t('wizard.displayTitle')}</Label>
                <Input
                  id={`title-${i}`}
                  value={entry.title}
                  onChange={(e) => updateEntry(i, { title: e.target.value })}
                  disabled={entry.state !== 'idle'}
                  className="h-8 text-sm"
                />
              </div>

              {/* Progress bar */}
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
                  {entry.error}
                </div>
              )}

              {entry.state === 'idle' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => uploadFile(i)}
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
      )}

      {/* File picker */}
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">{t('wizard.clickToSelect')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('wizard.supportedFormats')}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleFileSelect}
          aria-label="Select files to upload"
        />
      </div>
    
      {/* Rich Document section */}
      <div className="mt-6 border-t pt-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2"><PenLine className="h-4 w-4" /> Create Rich Document</p>
        <input className="w-full text-sm px-3 py-2 border rounded-md bg-background" placeholder="Document title..." value={richDocTitle} onChange={(e) => setRichDocTitle(e.target.value)} />
        <RichEditor content={richDocContent} onChange={setRichDocContent} />
        <div className="flex items-center gap-2 justify-end">
          {richDocSaved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Added</span>}
          <button type="button" onClick={handleSaveRichDoc} disabled={!richDocTitle.trim()} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50">Add Rich Document</button>
        </div>
      </div>
      {/* Alt-text review modal for image uploads (F-023) */}
      {altTextTarget && (
        <AltTextModal
          mediaId={altTextTarget.mediaId}
          initialAltText={altTextTarget.altText}
          open={true}
          onClose={() => setAltTextTarget(null)}
          onSaved={(text) => {
            onChange({
              mediaList: mediaList.map((m) =>
                m.id === altTextTarget.mediaId ? { ...m, altText: text } : m
              ),
            });
            setAltTextTarget(null);
          }}
        />
      )}
</div>
  );
}
