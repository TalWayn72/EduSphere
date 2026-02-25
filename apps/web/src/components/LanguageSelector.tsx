import React from 'react';
import { useTranslation } from 'react-i18next';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type SupportedLocale } from '@edusphere/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LanguageSelectorProps {
  value: SupportedLocale;
  onChange: (locale: SupportedLocale) => void;
  disabled?: boolean;
  availableLocales?: readonly SupportedLocale[];
}

export function LanguageSelector({ value, onChange, disabled, availableLocales }: LanguageSelectorProps) {
  const { t } = useTranslation('settings');
  const locales = availableLocales ?? SUPPORTED_LOCALES;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none">
        {t('language.title')}
      </label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as SupportedLocale)}
        disabled={disabled}
      >
        <SelectTrigger
          className="w-[300px]"
          aria-label={t('language.title')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locales.map((locale) => {
            const info = LOCALE_LABELS[locale];
            return (
              <SelectItem key={locale} value={locale}>
                <span className="flex items-center gap-2">
                  <span role="img" aria-label={info.english}>{info.flag}</span>
                  <span className="font-medium">{info.native}</span>
                  <span className="text-muted-foreground text-xs">({info.english})</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {t('language.description')}
      </p>
    </div>
  );
}
