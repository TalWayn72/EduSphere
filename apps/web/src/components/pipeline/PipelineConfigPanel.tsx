/**
 * PipelineConfigPanel — right-side panel showing per-node configuration.
 * Opens when a pipeline node is selected; allows enable/disable + module params.
 *
 * Features:
 *   A — QA_GATE quality threshold shows ⓘ tooltip icon
 *   B — Content language remembers last selection (per localStorage + user locale)
 *   C — INGESTION allows file upload from device (blob URL approach)
 */
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LOCALE, LOCALE_LABELS } from '@edusphere/i18n';
import { useLessonPipelineStore, type PipelineNode } from '@/lib/lesson-pipeline.store';

export interface LessonAsset {
  id: string;
  assetType: string;
  sourceUrl?: string | null;
  fileUrl?: string | null;
}

interface Props {
  node: PipelineNode;
  assets: LessonAsset[];
  onClose: () => void;
}

// Languages available for ASR transcription (superset of UI locales — includes Arabic)
const ASR_LANGUAGES = [
  { value: 'he', label: LOCALE_LABELS['he'].native },
  { value: 'en', label: LOCALE_LABELS['en'].native },
  { value: 'ar', label: 'العربية' },
] as const;

// ── Feature B: remembered content language ────────────────────────────────────

const PIPELINE_LOCALE_KEY = 'edusphere:pipeline:contentLocale';

function useLastPipelineLocale(): [string, (v: string) => void] {
  const { i18n } = useTranslation();
  const [locale, setLocaleState] = useState<string>(() => {
    return localStorage.getItem(PIPELINE_LOCALE_KEY) ?? i18n.language ?? DEFAULT_LOCALE;
  });
  const setLocale = (v: string) => {
    localStorage.setItem(PIPELINE_LOCALE_KEY, v);
    setLocaleState(v);
  };
  return [locale, setLocale];
}

// ── Main component ────────────────────────────────────────────────────────────

export function PipelineConfigPanel({ node, assets, onClose }: Props) {
  const { t } = useTranslation('content');
  const { updateNodeConfig, toggleNode } = useLessonPipelineStore();

  // Feature B: remembered locale
  const [lastLocale, setLastLocale] = useLastPipelineLocale();

  const set = (key: string, value: unknown) =>
    updateNodeConfig(node.id, { ...node.config, [key]: value });

  const videoAssets = assets.filter((a) => a.assetType === 'VIDEO');
  const audioAssets = assets.filter((a) => a.assetType === 'AUDIO');
  const notesAssets = assets.filter((a) => a.assetType === 'NOTES');

  return (
    <div
      className="w-80 border-l bg-white overflow-y-auto flex flex-col shrink-0"
      data-testid="config-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <div className="font-medium text-sm">{node.labelHe}</div>
          <div className="text-xs text-gray-400">{node.label}</div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label={t('pipeline.closeSettings')}
          data-testid="config-panel-close"
        >
          ✕
        </button>
      </div>

      {/* Enable / Disable */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <span className="text-sm text-gray-600">{t('pipeline.enableModule')}</span>
        <button
          role="switch"
          aria-checked={node.enabled}
          onClick={() => toggleNode(node.id)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${node.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
          data-testid="node-toggle"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${node.enabled ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {/* Module-specific config */}
      <div className="px-4 py-4 space-y-4 flex-1 overflow-y-auto">
        {node.moduleType === 'INGESTION' && (
          <IngestionConfig
            config={node.config}
            videoAssets={videoAssets}
            audioAssets={audioAssets}
            notesAssets={notesAssets}
            onChange={set}
            defaultLocale={lastLocale}
            onLocaleChange={setLastLocale}
          />
        )}
        {node.moduleType === 'ASR' && (
          <Field label={t('pipeline.asrLanguage')}>
            <Select
              value={(node.config['language'] as string) ?? DEFAULT_LOCALE}
              onChange={(v) => set('language', v)}
              options={ASR_LANGUAGES.map((l) => ({
                value: l.value,
                label: l.label,
              }))}
            />
          </Field>
        )}
        {node.moduleType === 'SUMMARIZATION' && (
          <Field label={t('pipeline.summarizationStyle')}>
            <Select
              value={(node.config['style'] as string) ?? 'academic'}
              onChange={(v) => set('style', v)}
              options={[
                { value: 'academic', label: t('pipeline.summaryAcademic') },
                { value: 'friendly', label: t('pipeline.summaryFriendly') },
                { value: 'brief', label: t('pipeline.summaryBrief') },
              ]}
            />
          </Field>
        )}
        {node.moduleType === 'DIAGRAM_GENERATOR' && (
          <Field label={t('pipeline.diagramType')}>
            <Select
              value={(node.config['diagramType'] as string) ?? 'mindmap'}
              onChange={(v) => set('diagramType', v)}
              options={[
                { value: 'mindmap', label: t('pipeline.diagramMindmap') },
                { value: 'flowchart', label: t('pipeline.diagramFlowchart') },
                { value: 'graph', label: t('pipeline.diagramGraph') },
              ]}
            />
          </Field>
        )}
        {node.moduleType === 'CITATION_VERIFIER' && (
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(node.config['strictMode'])}
              onChange={(e) => set('strictMode', e.target.checked)}
              data-testid="strict-mode-toggle"
            />
            {t('pipeline.strictMode')}
          </label>
        )}
        {node.moduleType === 'QA_GATE' && (
          /* Feature A: tooltip on quality threshold label */
          <Field
            label={t('pipeline.qualityThreshold', {
              value: (node.config['threshold'] as number) ?? 70,
            })}
            tooltip={t('pipeline.qualityThresholdTooltip')}
          >
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={(node.config['threshold'] as number) ?? 70}
              onChange={(e) => set('threshold', Number(e.target.value))}
              className="w-full"
              data-testid="qa-threshold"
            />
          </Field>
        )}
        {['NER_SOURCE_LINKING', 'CONTENT_CLEANING', 'STRUCTURED_NOTES', 'PUBLISH_SHARE'].includes(
          node.moduleType
        ) && (
          <p className="text-xs text-gray-500">{t('pipeline.autoModule')}</p>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Feature A: Field now accepts an optional tooltip prop. */
function Field({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
        {label}
        {tooltip && (
          <span
            title={tooltip}
            className="cursor-help text-gray-400 hover:text-gray-600 ml-1"
            aria-label={tooltip}
            data-testid="field-tooltip"
          >
            ⓘ
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded px-2 py-1.5 text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Feature B + C: IngestionConfig with remembered locale and device file upload. */
function IngestionConfig({
  config,
  videoAssets,
  audioAssets,
  notesAssets,
  onChange,
  defaultLocale,
  onLocaleChange,
}: {
  config: Record<string, unknown>;
  videoAssets: LessonAsset[];
  audioAssets: LessonAsset[];
  notesAssets: LessonAsset[];
  onChange: (key: string, value: unknown) => void;
  defaultLocale: string;
  onLocaleChange: (v: string) => void;
}) {
  const { t } = useTranslation('content');
  const currentUrl = (config['sourceUrl'] as string) ?? '';

  // Feature C: file upload state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Create a blob URL as a local reference.
      // In production, this would upload via presigned URL.
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
      <Field label={t('pipeline.sourceFile')}>
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
      </Field>
      <Field label={t('pipeline.manualUrl')}>
        <input
          type="url"
          placeholder="https://..."
          value={currentUrl}
          onChange={(e) => onChange('sourceUrl', e.target.value || undefined)}
          className="w-full border rounded px-2 py-1.5 text-sm"
          data-testid="ingestion-source-url"
        />
      </Field>
      {/* Feature B: content language defaults to remembered locale */}
      <Field label={t('pipeline.contentLanguage')}>
        <Select
          value={(config['locale'] as string) ?? defaultLocale}
          onChange={(v) => {
            onChange('locale', v);
            onLocaleChange(v);
          }}
          options={ASR_LANGUAGES.map((l) => ({ value: l.value, label: l.label }))}
        />
      </Field>
      {/* Feature C: upload from device */}
      <Field label={t('pipeline.uploadFromDevice')}>
        <label
          className={`flex items-center gap-2 cursor-pointer border rounded px-2 py-1.5 text-sm transition-colors ${
            uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'
          }`}
        >
          <span>📂</span>
          <span className="text-gray-600 flex-1 truncate">
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
          <span className="text-xs text-blue-500 animate-pulse mt-1 block">
            {t('pipeline.uploadingFile')}
          </span>
        )}
      </Field>
    </div>
  );
}
