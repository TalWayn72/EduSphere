/**
 * AddSourceModal — Modal for adding a new knowledge source (URL, text, YouTube, file).
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AddTab } from './types';
import { TAB_KEYS, TAB_LABEL_KEYS } from './types';
import { getSourceErrorKey } from './utils';
import {
  useAddUrlMutation,
  useAddTextMutation,
  useAddYoutubeMutation,
  useAddFileMutation,
} from './useAddSourceMutations';

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
  const [selectedFileName, setSelectedFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Close modal on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !success) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, success]);

  // Auto-close 1.5 s after success is shown
  useEffect(() => {
    if (success) {
      closeTimerRef.current = setTimeout(onClose, 1500);
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [success, onClose]);

  const callbacks = { onAdded, setSuccess, setError, t };
  const addUrl = useAddUrlMutation(callbacks);
  const addText = useAddTextMutation(callbacks);
  const addYoutube = useAddYoutubeMutation(callbacks);
  const addFile = useAddFileMutation(callbacks);

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
        const contentBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(',')[1] ?? '');
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        await addFile.mutateAsync({
          courseId,
          title: fileTitle || file.name,
          fileName: file.name,
          contentBase64,
          mimeType: file.type || 'application/octet-stream',
        });
      }
    } catch (e) {
      setError(t(getSourceErrorKey(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="w-[520px] rounded-2xl bg-white shadow-2xl flex flex-col"
        dir={dir}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {t('sources.addSourceTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground text-xl"
          >
            &#x2715;
          </button>
        </div>

        {/* Tabs -- hidden when success */}
        {!success && (
          <div className="flex border-b px-6">
            {TAB_KEYS.map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${tab === tabKey ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground'}`}
              >
                {t(TAB_LABEL_KEYS[tabKey])}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {success && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">&#x2705;</span>
              </div>
              <p className="font-semibold text-green-700 text-base">
                {t('sources.addedSuccess')}
              </p>
              <p className="text-sm text-gray-500">
                {t('sources.addedProcessing')}
              </p>
            </div>
          )}

          {!success && tab === 'url' && (
            <>
              <label className="text-xs font-medium text-gray-700">
                {t('sources.urlLabel')}
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder={t('sources.urlPlaceholder')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                dir="ltr"
              />
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder={t('sources.titleOptional')}
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
              />
              <p className="text-xs text-gray-500">{t('sources.urlHint')}</p>
            </>
          )}

          {!success && tab === 'text' && (
            <>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={t('sources.titleOptional')}
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
              />
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder={t('sources.textPlaceholder')}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          )}

          {!success && tab === 'youtube' && (
            <>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder={t('sources.youtubePlaceholder')}
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                dir="ltr"
              />
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={t('sources.titleOptional')}
                value={youtubeTitle}
                onChange={(e) => setYoutubeTitle(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                {t('sources.youtubeHint')}
              </p>
            </>
          )}

          {!success && tab === 'file' && (
            <>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={t('sources.titleOptional')}
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
                disabled={busy}
              />
              {busy ? (
                <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-sm text-blue-700 font-medium">
                    {t('sources.uploading')}
                  </span>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
                  <span className="text-3xl mb-1">
                    {selectedFileName ? '\u{1F4C4}' : '\u{1F4C2}'}
                  </span>
                  <span className="text-sm text-gray-600">
                    {selectedFileName
                      ? t('sources.fileChanged', { name: selectedFileName })
                      : t('sources.dropOrClick')}
                  </span>
                  {!selectedFileName && (
                    <span className="text-xs text-gray-400 mt-1">
                      {t('sources.fileHint')}
                    </span>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".docx,.pdf,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setSelectedFileName(f.name);
                        if (!fileTitle) setFileTitle(f.name);
                      }
                    }}
                  />
                </label>
              )}
            </>
          )}

          {!success && error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer -- hidden when success */}
        {!success && (
          <div className="flex gap-3 justify-end px-6 py-4 border-t">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40"
            >
              {t('sources.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {busy ? t('sources.submitAdding') : t('sources.submit')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
