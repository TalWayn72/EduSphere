/**
 * ModuleConfigs — per-module-type configuration sections.
 */
import { useTranslation } from 'react-i18next';
import { DEFAULT_LOCALE, LOCALE_LABELS } from '@edusphere/i18n';
import { ConfigField, ConfigSelect } from './ConfigField';

const ASR_LANGUAGES = [
  { value: 'he', label: LOCALE_LABELS['he'].native },
  { value: 'en', label: LOCALE_LABELS['en'].native },
  { value: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
] as const;

interface ModuleConfigProps {
  moduleType: string;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function ModuleConfigs({ moduleType, config, onChange }: ModuleConfigProps) {
  const { t } = useTranslation('content');

  if (moduleType === 'ASR') {
    return (
      <ConfigField label={t('pipeline.asrLanguage')}>
        <ConfigSelect
          value={(config['language'] as string) ?? DEFAULT_LOCALE}
          onChange={(v) => onChange('language', v)}
          options={ASR_LANGUAGES.map((l) => ({ value: l.value, label: l.label }))}
        />
      </ConfigField>
    );
  }

  if (moduleType === 'SUMMARIZATION') {
    return (
      <ConfigField label={t('pipeline.summarizationStyle')}>
        <ConfigSelect
          value={(config['style'] as string) ?? 'academic'}
          onChange={(v) => onChange('style', v)}
          options={[
            { value: 'academic', label: t('pipeline.summaryAcademic') },
            { value: 'friendly', label: t('pipeline.summaryFriendly') },
            { value: 'brief', label: t('pipeline.summaryBrief') },
          ]}
        />
      </ConfigField>
    );
  }

  if (moduleType === 'DIAGRAM_GENERATOR') {
    return (
      <ConfigField label={t('pipeline.diagramType')}>
        <ConfigSelect
          value={(config['diagramType'] as string) ?? 'mindmap'}
          onChange={(v) => onChange('diagramType', v)}
          options={[
            { value: 'mindmap', label: t('pipeline.diagramMindmap') },
            { value: 'flowchart', label: t('pipeline.diagramFlowchart') },
            { value: 'graph', label: t('pipeline.diagramGraph') },
          ]}
        />
      </ConfigField>
    );
  }

  if (moduleType === 'CITATION_VERIFIER') {
    return (
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={Boolean(config['strictMode'])}
          onChange={(e) => onChange('strictMode', e.target.checked)}
          data-testid="strict-mode-toggle"
        />
        {t('pipeline.strictMode')}
      </label>
    );
  }

  if (moduleType === 'QA_GATE') {
    return (
      <ConfigField
        label={t('pipeline.qualityThreshold', { value: (config['threshold'] as number) ?? 70 })}
        tooltip={t('pipeline.qualityThresholdTooltip')}
      >
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={(config['threshold'] as number) ?? 70}
          onChange={(e) => onChange('threshold', Number(e.target.value))}
          className="w-full"
          data-testid="qa-threshold"
        />
      </ConfigField>
    );
  }

  if (['NER_SOURCE_LINKING', 'CONTENT_CLEANING', 'STRUCTURED_NOTES', 'PUBLISH_SHARE'].includes(moduleType)) {
    return <p className="text-xs text-muted-foreground">{t('pipeline.autoModule')}</p>;
  }

  return null;
}
