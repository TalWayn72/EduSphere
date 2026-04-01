/**
 * IngestionConfig — source file, URL, locale, and device upload config.
 */
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigField, ConfigSelect } from './ConfigField';
import type { LessonAsset } from '../PipelineConfigPanel';

const ASR_LANGUAGES = [
  { value: 'he', label: '\u05E2\u05D1\u05E8\u05D9\u05EA' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
] as const;

interface IngestionConfigProps {
  config: Record<string, unknown>;
  videoAssets: LessonAsset[];
  audioAssets: LessonAsset[];
  notesAssets: LessonAsset[];
  onChange: (key: string, value: unknown) => void;
  defaultLocale: string;
  onLocaleChange: (v: string) => void;
}

export function IngestionConfig({
  config,
  videoAssets,
  audioAssets,
  notesAssets,
  onChange,
  defaultLocale,
  onLocaleChange,
}: IngestionConfigProps) {
  const { t } = useTranslation('content');
  const currentUrl = (config['sourceUrl'] as string) ?? '';

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const localUrl = URL.createObjectURL(file);
      setUploadedFileName(file.name);
      onChange('sourceUrl', localUrl);
      onChange('sourceFileName', file.name);
    } catch (err) {
      console.error('[PipelineConfigPanel] File upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <ConfigField label={t('pipeline.sourceFile')}>
        <select
          value={currentUrl}
          onChange={(e) => onChange('sourceUrl', e.target.value || undefined)}
          className="w-full border rounded px-2 py-1.5 text-sm"
          data-testid="ingestion-asset-picker"
        >
          <option value="">{t('pipeline.selectFile')}</option>
          {videoAssets.map((a) => (
            <option key={a.id} value={a.fileUrl ?? a.sourceUrl ?? ''}>
              {a.fileUrl ?? a.sourceUrl ?? a.id} ({t('pipeline.assetVideo')})
            </option>
          ))}
          {audioAssets.map((a) => (
            <option key={a.id} value={a.fileUrl ?? a.sourceUrl ?? ''}>
              {a.fileUrl ?? a.sourceUrl ?? a.id} ({t('pipeline.assetAudio')})
            </option>
          ))}
          {notesAssets.map((a) => (
            <option key={a.id} value={a.fileUrl ?? a.sourceUrl ?? ''}>
              {a.fileUrl ?? a.sourceUrl ?? a.id} ({t('pipeline.assetNotes')})
            </option>
          ))}
        </select>
      </ConfigField>
      <ConfigField label={t('pipeline.manualUrl')}>
        <input
          type="url"
          placeholder="https://..."
          value={currentUrl}
          onChange={(e) => onChange('sourceUrl', e.target.value || undefined)}
          className="w-full border rounded px-2 py-1.5 text-sm"
          data-testid="ingestion-source-url"
        />
      </ConfigField>
      <ConfigField label={t('pipeline.contentLanguage')}>
        <ConfigSelect
          value={(config['locale'] as string) ?? defaultLocale}
          onChange={(v) => {
            onChange('locale', v);
            onLocaleChange(v);
          }}
          options={ASR_LANGUAGES.map((l) => ({
            value: l.value,
            label: l.label,
          }))}
        />
      </ConfigField>
      <ConfigField label={t('pipeline.uploadFromDevice')}>
        <label
          className={`flex items-center gap-2 cursor-pointer border rounded px-2 py-1.5 text-sm transition-colors ${
            uploading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-blue-400'
          }`}
        >
          <span>{'\uD83D\uDCC2'}</span>
          <span className="text-muted-foreground flex-1 truncate">
            {uploadedFileName ?? t('pipeline.chooseFile')}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*,.pdf,.docx,.txt"
            className="hidden"
            data-testid="ingestion-file-upload"
            onChange={(e) => void handleFileUpload(e)}
            disabled={uploading}
          />
        </label>
        {uploading && (
          <span className="text-xs text-blue-500 animate-pulse mt-1 block dark:text-blue-400">
            {t('pipeline.uploadingFile')}
          </span>
        )}
      </ConfigField>
    </div>
  );
}
