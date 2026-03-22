/**
 * GamificationConfig — Badge editor, XP config, toggle for org gamification (F-12).
 * Route: /admin/org-gamification
 */
import React, { useState, useEffect, useCallback } from 'react';
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

// ── GraphQL ──────────────────────────────────────────────────────────────────

const GAMIFICATION_CONFIG_QUERY = `
  query GamificationConfig {
    gamificationConfig {
      enabled showLeaderboard showBadges showPoints showStreaks
      xpRules leaderboardScope
    }
  }
`;

const ORG_BADGES_QUERY = `
  query OrgBadges {
    orgBadges {
      id name description iconUrl xpRequired autoAwardCriteria isActive createdAt
    }
  }
`;

const UPDATE_CONFIG_MUTATION = `
  mutation UpdateGamificationConfig($input: UpdateGamificationConfigInput!) {
    updateGamificationConfig(input: $input) {
      enabled showLeaderboard showBadges showPoints showStreaks
    }
  }
`;

// ── Types ────────────────────────────────────────────────────────────────────

interface ConfigData {
  enabled: boolean;
  showLeaderboard: boolean;
  showBadges: boolean;
  showPoints: boolean;
  showStreaks: boolean;
  xpRules: Record<string, number>;
  leaderboardScope: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function GamificationConfig() {
  const { t } = useTranslation('orgGamification');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data: configData }] = useQuery({
    query: GAMIFICATION_CONFIG_QUERY,
    pause: !mounted,
  });
  const [{ data: badgesData }, reexecuteBadges] = useQuery({
    query: ORG_BADGES_QUERY,
    pause: !mounted,
  });
  const [, updateConfig] = useMutation(UPDATE_CONFIG_MUTATION);

  const config = configData?.gamificationConfig as ConfigData | undefined;
  const badges = (badgesData?.orgBadges ?? []) as BadgeData[];
  const [enabled, setEnabled] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeData | null>(null);

  useEffect(() => {
    if (config) setEnabled(config.enabled);
  }, [config]);

  const handleToggle = async (val: boolean) => {
    setEnabled(val);
    await updateConfig({ input: { enabled: val } });
  };

  const handleBadgeSaved = useCallback(() => {
    setEditingBadge(null);
    reexecuteBadges({ requestPolicy: 'network-only' });
  }, [reexecuteBadges]);

  const handleRefresh = useCallback(() => {
    reexecuteBadges({ requestPolicy: 'network-only' });
  }, [reexecuteBadges]);

  const xpRules = config?.xpRules ?? {};

  return (
    <AdminLayout
      title={t('gamification.title')}
      description={t('gamification.description')}
    >
      <div data-testid="gamification-config-page" className="space-y-6">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{t('gamification.enableLabel')}</p>
              <p className="text-xs text-muted-foreground">
                {t('gamification.enableDescription')}
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              aria-label={t('gamification.enableLabel')}
            />
          </CardContent>
        </Card>

        {enabled && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  label: t('gamification.xpPerLesson'),
                  value: xpRules.lesson_completion ?? 10,
                },
                {
                  label: t('gamification.xpPerQuiz'),
                  value: xpRules.quiz_pass ?? 25,
                },
                {
                  label: t('gamification.streakBonus'),
                  value: `${xpRules.streak_bonus_per_day ?? 2}/day`,
                },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="text-2xl font-bold">{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <GamificationBadgeForm
              t={t}
              editingBadge={editingBadge}
              onSaved={handleBadgeSaved}
              onCancel={() => setEditingBadge(null)}
            />
            <GamificationBadgeTable
              badges={badges}
              t={t}
              onEdit={setEditingBadge}
              onRefresh={handleRefresh}
            />
          </>
        )}
      </div>
    </AdminLayout>
  );
}
