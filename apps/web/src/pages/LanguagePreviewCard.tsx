/**
 * LanguagePreviewCard — Preview of enabled languages for LanguageSettingsPage.
 */
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { AVAILABLE_LOCALES } from './LanguageSettingsPage.locales';
import type { Locale } from './LanguageSettingsPage.locales';

interface LanguagePreviewCardProps {
  supported: Set<string>;
  defaultLanguage: string;
  defaultLocale: Locale | undefined;
}

export function LanguagePreviewCard({
  supported,
  defaultLanguage,
  defaultLocale,
}: LanguagePreviewCardProps) {
  const { t } = useTranslation('settings');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('languageAdmin.preview')}</CardTitle>
        <CardDescription>{t('languageAdmin.previewDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 text-sm">
          {AVAILABLE_LOCALES.filter((l) => supported.has(l.code)).map((l) => (
            <span
              key={l.code}
              dir={l.rtl ? 'rtl' : 'ltr'}
              className={
                'px-3 py-1.5 rounded-full border text-sm' +
                (l.code === defaultLanguage
                  ? ' bg-primary text-primary-foreground border-primary font-medium'
                  : ' bg-muted border-transparent')
              }
            >
              {l.nativeName}
            </span>
          ))}
        </div>
        {defaultLocale && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t('languageAdmin.default')}: <strong>{defaultLocale.name}</strong>
            {defaultLocale.rtl ? ` - ${t('languageAdmin.rtlApplied')}` : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
