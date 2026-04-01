/**
 * PipelineConfigPanel — right-side panel showing per-node configuration.
 * Opens when a pipeline node is selected; allows enable/disable + module params.
 *
 * Features:
 *   A — QA_GATE quality threshold shows tooltip icon
 *   B — Content language remembers last selection (per localStorage + user locale)
 *   C — INGESTION allows file upload from device (blob URL approach)
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LOCALE } from '@edusphere/i18n';
import {
  useLessonPipelineStore,
  type PipelineNode,
} from '@/lib/lesson-pipeline.store';
import { IngestionConfig } from './config-panel/IngestionConfig';
import { ModuleConfigs } from './config-panel/ModuleConfigs';

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

// ── Feature B: remembered content language ────────────────────────────────────

const PIPELINE_LOCALE_KEY = 'edusphere:pipeline:contentLocale';

function useLastPipelineLocale(): [string, (v: string) => void] {
  const { i18n } = useTranslation();
  const [locale, setLocaleState] = useState<string>(() => {
    return (
      localStorage.getItem(PIPELINE_LOCALE_KEY) ??
      i18n.language ??
      DEFAULT_LOCALE
    );
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

  const [lastLocale, setLastLocale] = useLastPipelineLocale();

  const set = (key: string, value: unknown) =>
    updateNodeConfig(node.id, { ...node.config, [key]: value });

  const videoAssets = assets.filter((a) => a.assetType === 'VIDEO');
  const audioAssets = assets.filter((a) => a.assetType === 'AUDIO');
  const notesAssets = assets.filter((a) => a.assetType === 'NOTES');

  return (
    <div
      className="w-80 border-l bg-card overflow-y-auto flex flex-col shrink-0"
      data-testid="config-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <div className="font-medium text-sm">{node.labelHe}</div>
          <div className="text-xs text-muted-foreground">{node.label}</div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-lg leading-none"
          aria-label={t('pipeline.closeSettings')}
          data-testid="config-panel-close"
        >
          {'\u2715'}
        </button>
      </div>

      {/* Enable / Disable */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {t('pipeline.enableModule')}
        </span>
        <button
          role="switch"
          aria-checked={node.enabled}
          onClick={() => toggleNode(node.id)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${node.enabled ? 'bg-blue-600' : 'bg-muted'}`}
          data-testid="node-toggle"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${node.enabled ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {/* Module-specific config */}
      <div className="px-4 py-4 space-y-4 flex-1 overflow-y-auto">
        {node.moduleType === 'INGESTION' ? (
          <IngestionConfig
            config={node.config}
            videoAssets={videoAssets}
            audioAssets={audioAssets}
            notesAssets={notesAssets}
            onChange={set}
            defaultLocale={lastLocale}
            onLocaleChange={setLastLocale}
          />
        ) : (
          <ModuleConfigs
            moduleType={node.moduleType}
            config={node.config}
            onChange={set}
          />
        )}
      </div>
    </div>
  );
}
