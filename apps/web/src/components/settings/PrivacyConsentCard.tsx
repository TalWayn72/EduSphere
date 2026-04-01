import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'urql';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';
import { UPDATE_CONSENT_MUTATION } from '@/lib/graphql/consent.queries';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { UseSettingsHighlightReturn } from '@/hooks/useSettingsHighlight';

const AI_PROCESSING_KEY = 'edusphere_consent_AI_PROCESSING';
const THIRD_PARTY_LLM_KEY = 'edusphere_consent_THIRD_PARTY_LLM';

interface ConsentToggle {
  id: string;
  storageKey: string;
  consentType: string;
  labelKey: string;
  descKey: string;
}

const TOGGLES: ConsentToggle[] = [
  {
    id: 'setting-ai-consent',
    storageKey: AI_PROCESSING_KEY,
    consentType: 'AI_PROCESSING',
    labelKey: 'privacy.aiProcessing',
    descKey: 'privacy.aiProcessingDesc',
  },
  {
    id: 'setting-third-party-llm',
    storageKey: THIRD_PARTY_LLM_KEY,
    consentType: 'THIRD_PARTY_LLM',
    labelKey: 'privacy.thirdPartyLlm',
    descKey: 'privacy.thirdPartyLlmDesc',
  },
];

export interface PrivacyConsentCardProps {
  highlight: UseSettingsHighlightReturn;
}

export function PrivacyConsentCard({ highlight }: PrivacyConsentCardProps) {
  const { t } = useTranslation('settings');
  const [, updateConsentMutation] = useMutation(UPDATE_CONSENT_MUTATION);
  const [consents, setConsents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const toggle of TOGGLES) {
      initial[toggle.storageKey] =
        localStorage.getItem(toggle.storageKey) === 'true';
    }
    setConsents(initial);
  }, []);

  const handleToggle = async (toggle: ConsentToggle, checked: boolean) => {
    // Optimistic: update localStorage + state immediately
    localStorage.setItem(toggle.storageKey, String(checked));
    setConsents((prev) => ({ ...prev, [toggle.storageKey]: checked }));

    // Sync to backend DB (GDPR Art.7 proof of consent)
    const { error } = await updateConsentMutation({
      input: { consentType: toggle.consentType, given: checked },
    });
    if (error) {
      // Revert on failure
      localStorage.setItem(toggle.storageKey, String(!checked));
      setConsents((prev) => ({ ...prev, [toggle.storageKey]: !checked }));
      toast.error(t('privacy.syncError'));
    } else {
      toast.success(t('privacy.saved'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {t('privacy.title')}
        </CardTitle>
        <CardDescription>{t('privacy.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {TOGGLES.map((toggle) => {
          const isTarget =
            highlight.highlightId === toggle.id.replace('setting-', '');
          const row = (
            <div
              key={toggle.id}
              id={toggle.id}
              ref={isTarget ? highlight.targetRef : undefined}
              className={`flex items-center justify-between gap-4 rounded-lg border p-3 ${
                isTarget ? highlight.highlightClass : ''
              }`}
            >
              <div className="space-y-0.5">
                <label
                  htmlFor={`switch-${toggle.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {t(toggle.labelKey)}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t(toggle.descKey)}
                </p>
              </div>
              <Switch
                id={`switch-${toggle.id}`}
                checked={consents[toggle.storageKey] ?? false}
                onCheckedChange={(v) => handleToggle(toggle, v)}
              />
            </div>
          );

          if (isTarget && highlight.isHighlighted) {
            return (
              <Tooltip key={toggle.id} defaultOpen>
                <TooltipTrigger asChild>{row}</TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {t('privacy.tooltip')}
                </TooltipContent>
              </Tooltip>
            );
          }

          return row;
        })}
      </CardContent>
    </Card>
  );
}
