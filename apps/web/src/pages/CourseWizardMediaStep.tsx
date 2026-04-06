import { Upload, CheckCircle2, PenLine, Youtube } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AltTextModal } from '@/components/AltTextModal';
import { RichEditor } from '@/components/editor/RichEditor';
import { YouTubeUrlInput } from '@/components/lesson/YouTubeUrlInput';
import type { UploadedMedia, CourseFormData } from './course-create.types';
import { useMediaUpload } from './useMediaUpload';
import { MediaUploadEntries } from './MediaUploadEntries';

const ACCEPTED_TYPES = [
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
].join(',');

interface Props {
  courseId: string;
  mediaList: UploadedMedia[];
  onChange: (updates: Partial<CourseFormData>) => void;
}

export function CourseWizardMediaStep({
  courseId,
  mediaList,
  onChange,
}: Props) {
  const {
    inputRef,
    entries,
    altTextTarget,
    setAltTextTarget,
    richDocTitle,
    setRichDocTitle,
    richDocContent,
    setRichDocContent,
    richDocSaved,
    handleFileSelect,
    uploadFile,
    removeEntry,
    updateEntry,
    handleSaveRichDoc,
    ingestYouTube,
    youtubeLoading,
    youtubeError,
    t,
  } = useMediaUpload(courseId, mediaList, onChange);

  return (
    <div className="space-y-6">
      {/* Existing confirmed media */}
      {mediaList.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t('wizard.uploadedFiles', { count: mediaList.length })}
          </p>
          {mediaList.map((m) => (
            <Card key={m.id} className="p-3 flex items-center gap-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 dark:text-green-400" />
              <span className="flex-1 truncate font-medium">{m.title}</span>
              <span className="text-muted-foreground text-xs">
                {m.contentType}
              </span>
            </Card>
          ))}
        </div>
      )}

      {/* Pending upload entries */}
      <MediaUploadEntries
        entries={entries}
        onUpload={uploadFile}
        onRemove={removeEntry}
        onUpdateEntry={updateEntry}
        t={t}
      />

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
          aria-label={t('wizard.selectFilesAriaLabel')}
        />
      </div>

      {/* YouTube ingest section */}
      <div className="mt-6 border-t pt-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2">
          <Youtube className="h-4 w-4" /> {t('wizard.addYoutubeVideo')}
        </p>
        <YouTubeUrlInput onSubmit={ingestYouTube} loading={youtubeLoading} />
        {youtubeError && (
          <p className="text-sm text-destructive">{youtubeError}</p>
        )}
      </div>

      {/* Rich Document section */}
      <div className="mt-6 border-t pt-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2">
          <PenLine className="h-4 w-4" /> {t('wizard.createRichDocument')}
        </p>
        <input
          className="w-full text-sm px-3 py-2 border rounded-md bg-background"
          placeholder={t('wizard.richDocTitlePlaceholder')}
          value={richDocTitle}
          onChange={(e) => setRichDocTitle(e.target.value)}
        />
        <RichEditor content={richDocContent} onChange={setRichDocContent} />
        <div className="flex items-center gap-2 justify-end">
          {richDocSaved && (
            <span className="text-sm text-green-600 flex items-center gap-1 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" /> {t('wizard.richDocAdded')}
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveRichDoc}
            disabled={!richDocTitle.trim()}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {t('wizard.addRichDocument')}
          </button>
        </div>
      </div>

      {/* Alt-text review modal */}
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
