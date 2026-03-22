/**
 * GamificationConfig — Badge editor, XP config, toggle for org gamification.
 * Route: /admin/org-gamification
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  GamificationBadgeForm,
  GamificationBadgeTable,
  type BadgeData,
} from './GamificationConfig.badges';

const GAMIFICATION_CONFIG_QUERY = `
  query GamificationConfig {
    gamificationConfig {
      enabled xpPerLesson xpPerQuiz streakBonusMultiplier
      badges { id name description iconUrl xpRequired }
    }
  }
`;

const UPDATE_CONFIG_MUTATION = `
  mutation UpdateGamificationConfig($input: GamificationConfigInput!) {
    updateGamificationConfig(input: $input) { enabled }
  }
`;

interface ConfigData {
  enabled: boolean;
  xpPerLesson: number;
  xpPerQuiz: number;
  streakBonusMultiplier: number;
  badges: BadgeData[];
}

export function GamificationConfig() {
  const { t } = useTranslation('orgGamification');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data }] = useQuery({ query: GAMIFICATION_CONFIG_QUERY, pause: !mounted });
  const [, updateConfig] = useMutation(UPDATE_CONFIG_MUTATION);

  const config = data?.gamificationConfig as ConfigData | undefined;
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (config) setEnabled(config.enabled);
  }, [config]);

  const handleToggle = async (val: boolean) => {
    setEnabled(val);
    await updateConfig({ input: { enabled: val } });
  };

  return (
    <AdminLayout title={t('gamification.title')} description={t('gamification.description')}>
      <div data-testid="gamification-config-page" className="space-y-6">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{t('gamification.enableLabel')}</p>
              <p className="text-xs text-muted-foreground">{t('gamification.enableDescription')}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggle} aria-label={t('gamification.enableLabel')} />
          </CardContent>
        </Card>

        {enabled && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: t('gamification.xpPerLesson'), value: config?.xpPerLesson ?? 10 },
                { label: t('gamification.xpPerQuiz'), value: config?.xpPerQuiz ?? 25 },
                { label: t('gamification.streakBonus'), value: `${config?.streakBonusMultiplier ?? 1.5}x` },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-bold">{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <GamificationBadgeForm t={t} />
            <GamificationBadgeTable badges={config?.badges ?? []} t={t} />
          </>
        )}
      </div>
    </AdminLayout>
  );
}
