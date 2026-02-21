import { useEffect, useCallback } from 'react';
import { useMutation, useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import type { SupportedLocale } from '@edusphere/i18n';
import { ME_QUERY, UPDATE_USER_PREFERENCES_MUTATION } from '@/lib/queries';

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

interface UseUserPreferencesReturn {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  isSaving: boolean;
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const { i18n } = useTranslation();
  const [meResult] = useQuery<MeQueryResult>({ query: ME_QUERY });
  const [{ fetching }, updatePreferences] = useMutation(UPDATE_USER_PREFERENCES_MUTATION);

  // Sync DB locale → i18next + localStorage after ME_QUERY resolves
  useEffect(() => {
    const dbLocale = meResult.data?.me?.preferences?.locale;
    if (dbLocale && dbLocale !== i18n.language) {
      void i18n.changeLanguage(dbLocale);
      localStorage.setItem('edusphere_locale', dbLocale);
    }
  }, [meResult.data?.me?.preferences?.locale, i18n]);

  const setLocale = useCallback(async (locale: SupportedLocale): Promise<void> => {
    // Optimistic: update i18next + localStorage immediately for instant UX
    await i18n.changeLanguage(locale);
    localStorage.setItem('edusphere_locale', locale);
    // Persist to DB (background — non-blocking)
    await updatePreferences({ input: { locale } });
  }, [i18n, updatePreferences]);

  const currentLocale = (
    meResult.data?.me?.preferences?.locale ?? i18n.language
  ) as SupportedLocale;

  return { locale: currentLocale, setLocale, isSaving: fetching };
}
