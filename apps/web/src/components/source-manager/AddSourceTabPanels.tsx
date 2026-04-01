/**
 * AddSourceTabPanels — Per-tab form content for AddSourceModal.
 */
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

interface UrlPanelProps {
  url: string;
  urlTitle: string;
  onUrlChange: (v: string) => void;
  onTitleChange: (v: string) => void;
}

export function UrlPanel({
  url,
  urlTitle,
  onUrlChange,
  onTitleChange,
}: UrlPanelProps) {
  const { t } = useTranslation('content');
  return (
    <>
      <label className="text-xs font-medium text-gray-700 dark:text-gray-200">
        {t('sources.urlLabel')}
      </label>
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder={t('sources.urlPlaceholder')}
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        dir="ltr"
      />
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder={t('sources.titleOptional')}
        value={urlTitle}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('sources.urlHint')}
      </p>
    </>
  );
}

interface TextPanelProps {
  text: string;
  textTitle: string;
  onTextChange: (v: string) => void;
  onTitleChange: (v: string) => void;
}

export function TextPanel({
  text,
  textTitle,
  onTextChange,
  onTitleChange,
}: TextPanelProps) {
  const { t } = useTranslation('content');
  return (
    <>
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm"
        placeholder={t('sources.titleOptional')}
        value={textTitle}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <textarea
        className="w-full border rounded-lg px-3 py-2 text-sm h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder={t('sources.textPlaceholder')}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
      />
    </>
  );
}

interface YoutubePanelProps {
  youtubeUrl: string;
  youtubeTitle: string;
  onUrlChange: (v: string) => void;
  onTitleChange: (v: string) => void;
}

export function YoutubePanel({
  youtubeUrl,
  youtubeTitle,
  onUrlChange,
  onTitleChange,
}: YoutubePanelProps) {
  const { t } = useTranslation('content');
  return (
    <>
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder={t('sources.youtubePlaceholder')}
        value={youtubeUrl}
        onChange={(e) => onUrlChange(e.target.value)}
        dir="ltr"
      />
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm"
        placeholder={t('sources.titleOptional')}
        value={youtubeTitle}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('sources.youtubeHint')}
      </p>
    </>
  );
}

interface FilePanelProps {
  fileTitle: string;
  selectedFileName: string;
  busy: boolean;
  fileRef: RefObject<HTMLInputElement | null>;
  onTitleChange: (v: string) => void;
  onFileSelect: (name: string) => void;
}

export function FilePanel({
  fileTitle,
  selectedFileName,
  busy,
  fileRef,
  onTitleChange,
  onFileSelect,
}: FilePanelProps) {
  const { t } = useTranslation('content');
  return (
    <>
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm"
        placeholder={t('sources.titleOptional')}
        value={fileTitle}
        onChange={(e) => onTitleChange(e.target.value)}
        disabled={busy}
      />
      {busy ? (
        <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50 dark:border-blue-700 dark:bg-blue-950">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2 dark:border-blue-400" />
          <span className="text-sm text-blue-700 font-medium dark:text-blue-300">
            {t('sources.uploading')}
          </span>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 transition-colors dark:border-gray-600">
          <span className="text-3xl mb-1">
            {selectedFileName ? '\u{1F4C4}' : '\u{1F4C2}'}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {selectedFileName
              ? t('sources.fileChanged', { name: selectedFileName })
              : t('sources.dropOrClick')}
          </span>
          {!selectedFileName && (
            <span className="text-xs text-gray-400 mt-1 dark:text-gray-500">
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
                onFileSelect(f.name);
              }
            }}
          />
        </label>
      )}
    </>
  );
}
