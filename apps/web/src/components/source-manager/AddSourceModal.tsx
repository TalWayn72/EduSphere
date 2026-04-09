/**
 * AddSourceModal — Modal for adding a new knowledge source (URL, text, YouTube, file).
 * BUG-098: Radix Dialog for a11y. Auth pre-check prevents 400 errors on expired sessions.
 * Progress: Phase 1 (FileReader base64) via useFileReadProgress,
 *           Phase 2 (network upload) via useXHRGraphQLUpload (XHR upload.onprogress).
 */
import { useState, useRef, useEffect } from 'react';
import { useFileReadProgress } from '@/hooks/useFileReadProgress';
import { useXHRGraphQLUpload } from '@/hooks/useXHRGraphQLUpload';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { AddTab } from './types';
import { TAB_KEYS, TAB_LABEL_KEYS } from './types';
import {
  getSourceErrorKey,
  hasValidAuth,
  authHeaders,
  IS_DEV_MODE,
} from './utils';
import {
  useAddUrlMutation,
  useAddTextMutation,
  useAddYoutubeMutation,
} from './useAddSourceMutations';
import { ADD_FILE_SOURCE } from '@/lib/graphql/sources.queries';
import {
  UrlPanel,
  TextPanel,
  YoutubePanel,
  FilePanel,
} from './AddSourceTabPanels';
import { UploadProgressBar } from './UploadProgressBar';
import { devAddSource } from './dev-mock';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AddFileSourceResponse {
  addFileSource: {
    id: string;
    title: string;
    sourceType: string;
    status: string;
    origin?: string;
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddSourceModal({
  courseId,
  onClose,
  onAdded,
}: {
  courseId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { t, i18n } = useTranslation('content');
  const dir = i18n.dir();
  const [tab, setTab] = useState<AddTab>('url');
  const [url, setUrl] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [text, setText] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [fileTitle, setFileTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => {
    if (!hasValidAuth()) {
      setError(t('sources.errorUnauthorized'));
    }
  }, [t]);

  useEffect(() => {
    if (success) {
      closeTimerRef.current = setTimeout(onClose, 1500);
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [success, onClose]);

  const {
    readFileAsBase64,
    progress: readProgress,
    isReading,
  } = useFileReadProgress();

  const {
    execute: executeXHR,
    isUploading,
    uploadProgress,
  } = useXHRGraphQLUpload<AddFileSourceResponse>({
    headers: authHeaders(),
  });

  const callbacks = { onAdded, setSuccess, setError, t };
  const addUrl = useAddUrlMutation(callbacks);
  const addText = useAddTextMutation(callbacks);
  const addYoutube = useAddYoutubeMutation(callbacks);

  const handleSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      if (tab === 'url') {
        if (!url) return setError(t('sources.urlRequired'));
        const title = urlTitle || new URL(url).hostname;
        await addUrl.mutateAsync({ courseId, title, url });
      } else if (tab === 'text') {
        if (!text.trim()) return setError(t('sources.textRequired'));
        const title = textTitle || text.slice(0, 50) + '...';
        await addText.mutateAsync({ courseId, title, text });
      } else if (tab === 'youtube') {
        if (!youtubeUrl.trim()) return setError(t('sources.youtubeRequired'));
        const title = youtubeTitle || youtubeUrl;
        await addYoutube.mutateAsync({ courseId, title, url: youtubeUrl });
      } else if (tab === 'file') {
        const file = fileRef.current?.files?.[0];
        if (!file) return setError(t('sources.fileRequired'));

        // Phase 1: Read file as base64 (local, shows read progress bar)
        const contentBase64 = await readFileAsBase64(file);

        const input = {
          courseId,
          title: fileTitle || file.name,
          fileName: file.name,
          contentBase64,
          mimeType: file.type || 'application/octet-stream',
        };

        if (IS_DEV_MODE) {
          const lower = file.name.toLowerCase();
          const devType = lower.endsWith('.docx')
            ? ('FILE_DOCX' as const)
            : lower.endsWith('.txt')
              ? ('FILE_TXT' as const)
              : ('FILE_PDF' as const);
          devAddSource(devType, input.title, file.name);
          onAdded();
          setSuccess(true);
        } else {
          // Phase 2: Upload via XHR for real upload progress
          await executeXHR(ADD_FILE_SOURCE, { input });
          onAdded();
          setSuccess(true);
        }
      }
    } catch (e) {
      setError(t(getSourceErrorKey(e)));
    } finally {
      setBusy(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!fileTitle) setFileTitle(file.name);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="w-[520px] max-w-[90vw] p-0 gap-0"
        dir={dir}
        data-testid="add-source-modal"
        onInteractOutside={(e) => {
          if (success) e.preventDefault();
        }}
      >
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {t('sources.addSourceTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t(
              'sources.addSourceDescription',
              'Add a knowledge source to this course'
            )}
          </DialogDescription>
        </DialogHeader>

        {!success && (
          <div className="flex border-b px-6" role="tablist">
            {TAB_KEYS.map((tabKey) => (
              <button
                key={tabKey}
                role="tab"
                aria-selected={tab === tabKey}
                onClick={() => setTab(tabKey)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${tab === tabKey ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white'}`}
              >
                {t(TAB_LABEL_KEYS[tabKey])}
              </button>
            ))}
          </div>
        )}

        <div className="p-6 flex flex-col gap-4" role="tabpanel">
          {success && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center dark:bg-green-900">
                <span className="text-3xl">&#x2705;</span>
              </div>
              <p className="font-semibold text-green-700 text-base dark:text-green-300">
                {t('sources.addedSuccess')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('sources.addedProcessing')}
              </p>
            </div>
          )}

          {!success && tab === 'url' && (
            <UrlPanel
              url={url}
              urlTitle={urlTitle}
              onUrlChange={setUrl}
              onTitleChange={setUrlTitle}
            />
          )}
          {!success && tab === 'text' && (
            <TextPanel
              text={text}
              textTitle={textTitle}
              onTextChange={setText}
              onTitleChange={setTextTitle}
            />
          )}
          {!success && tab === 'youtube' && (
            <YoutubePanel
              youtubeUrl={youtubeUrl}
              youtubeTitle={youtubeTitle}
              onUrlChange={setYoutubeUrl}
              onTitleChange={setYoutubeTitle}
            />
          )}
          {!success && tab === 'file' && (
            <>
              <FilePanel
                fileTitle={fileTitle}
                selectedFileName={selectedFile?.name ?? ''}
                busy={busy}
                fileRef={fileRef}
                onTitleChange={setFileTitle}
                onFileSelect={(_name) => {
                  const file = fileRef.current?.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <UploadProgressBar
                isReading={isReading}
                readProgress={readProgress}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                fileSize={selectedFile?.size}
              />
            </>
          )}

          {!success && error && (
            <p
              className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 dark:text-red-400 dark:bg-red-950"
              role="alert"
              data-testid="source-error-message"
            >
              {error}
            </p>
          )}
        </div>

        {!success && (
          <div className="flex gap-3 justify-end px-6 py-4 border-t">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 dark:text-gray-300"
            >
              {t('sources.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:text-white"
              data-testid="add-source-submit"
            >
              {busy && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin dark:border-gray-700" />
              )}
              {busy ? t('sources.submitAdding') : t('sources.submit')}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
