import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import type { SupportedLocale } from '@edusphere/i18n';

export function SettingsPage() {
  const { t } = useTranslation('settings');
  const { locale, setLocale, isSaving } = useUserPreferences();

  const handleLocaleChange = async (newLocale: SupportedLocale): Promise<void> => {
    try {
      await setLocale(newLocale);
      toast.success(t('language.saved'));
    } catch {
      toast.error(t('language.error'));
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('language.title')}</CardTitle>
            <CardDescription>{t('language.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSelector
              value={locale}
              onChange={(l) => void handleLocaleChange(l)}
              disabled={isSaving}
            />
            {isSaving && (
              <p className="text-xs text-muted-foreground mt-2">{t('language.saving')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
