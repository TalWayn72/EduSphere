import { useEffect, useCallback } from 'react';
import { useMutation, useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@edusphere/i18n';
import { ME_QUERY, UPDATE_USER_PREFERENCES_MUTATION } from '@/lib/queries';
import { MY_TENANT_LANGUAGE_SETTINGS_QUERY } from '@/lib/graphql/tenant-language.queries';
import { applyDocumentDirection } from '@/lib/i18n';

interface MeQueryResult {
  me: {
    id: string;
    preferences: {
      locale: string;
      theme: string;
      emailNotifications: boolean;
      pushNotifications: boolean;
    };
  } | null;
}

interface TenantLanguageSettingsResult {
  myTenantLanguageSettings: {
    supportedLanguages: string[];
    defaultLanguage: string;
  } | null;
}

interface UseUserPreferencesReturn {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  isSaving: boolean;
  availableLocales: readonly SupportedLocale[];
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const { i18n } = useTranslation();
  const [meResult] = useQuery<MeQueryResult>({ query: ME_QUERY });
  const [tenantLangResult] = useQuery<TenantLanguageSettingsResult>({
    query: MY_TENANT_LANGUAGE_SETTINGS_QUERY,
    pause: true, // myTenantLanguageSettings not in live gateway
  });
  const [{ fetching }, updatePreferences] = useMutation(
    UPDATE_USER_PREFERENCES_MUTATION
  );

  const availableLocales = (tenantLangResult.data?.myTenantLanguageSettings
    ?.supportedLanguages ?? SUPPORTED_LOCALES) as readonly SupportedLocale[];

  const tenantDefault = (tenantLangResult.data?.myTenantLanguageSettings
    ?.defaultLanguage ?? 'en') as SupportedLocale;

  const currentLocale = (meResult.data?.me?.preferences?.locale ??
    i18n.language) as SupportedLocale;

  // Sync DB locale → i18next + localStorage + document direction after ME_QUERY resolves
  useEffect(() => {
    const dbLocale = meResult.data?.me?.preferences?.locale;
    if (dbLocale && dbLocale !== i18n.language) {
      void i18n.changeLanguage(dbLocale);
      localStorage.setItem('edusphere_locale', dbLocale);
      applyDocumentDirection(dbLocale);
    }
  }, [meResult.data?.me?.preferences?.locale, i18n]);

  // Auto-fallback: if admin disabled user's current language, switch to tenant default
  useEffect(() => {
    if (
      availableLocales.length > 0 &&
      !availableLocales.includes(currentLocale) &&
      tenantDefault !== currentLocale
    ) {
      void (async () => {
        await i18n.changeLanguage(tenantDefault);
        localStorage.setItem('edusphere_locale', tenantDefault);
        applyDocumentDirection(tenantDefault);
        await updatePreferences({ input: { locale: tenantDefault } });
      })();
    }
  }, [availableLocales, currentLocale, tenantDefault, i18n, updatePreferences]);

  const setLocale = useCallback(
    async (locale: SupportedLocale): Promise<void> => {
      // Optimistic: update i18next + localStorage + document direction immediately for instant UX
      await i18n.changeLanguage(locale);
      localStorage.setItem('edusphere_locale', locale);
      applyDocumentDirection(locale);
      // Persist to DB (background — non-blocking)
      await updatePreferences({ input: { locale } });
    },
    [i18n, updatePreferences]
  );

  return {
    locale: currentLocale,
    setLocale,
    isSaving: fetching,
    availableLocales,
  };
}
