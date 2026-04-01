/**
 * LanguageListCard — Checkbox list of enabled languages for LanguageSettingsPage.
 */
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { AVAILABLE_LOCALES } from './LanguageSettingsPage.locales';

interface LanguageListCardProps {
  supported: Set<string>;
  defaultLanguage: string;
  onToggle: (code: string) => void;
  RtlBadge: React.ComponentType;
}

export function LanguageListCard({
  supported,
  defaultLanguage,
  onToggle,
  RtlBadge,
}: LanguageListCardProps) {
  const { t } = useTranslation('settings');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('languageAdmin.enabledLanguages')}</CardTitle>
        <CardDescription>
          {t('languageAdmin.enabledLanguagesDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {supported.size === 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            {t('languageAdmin.atLeastOne')}
          </div>
        )}
        {AVAILABLE_LOCALES.map((l) => {
          const isDefault = l.code === defaultLanguage;
          const isChecked = supported.has(l.code);
          return (
            <label
              key={l.code}
              className={
                'flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer' +
                (isDefault ? ' opacity-70' : '')
              }
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isDefault}
                onChange={() => onToggle(l.code)}
                className="h-4 w-4 rounded border"
              />
              <span className="text-sm font-medium flex-1">{l.name}</span>
              <span className="text-sm text-muted-foreground">
                {l.nativeName}
              </span>
              {l.rtl && <RtlBadge />}
              {isDefault && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {t('languageAdmin.default')}
                </span>
              )}
            </label>
          );
        })}
      </CardContent>
    </Card>
  );
}
