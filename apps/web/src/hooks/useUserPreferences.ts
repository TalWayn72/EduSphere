import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@edusphere/i18n';
import { ME_QUERY, UPDATE_USER_PREFERENCES_MUTATION } from '@/lib/queries';
import { MY_TENANT_LANGUAGE_SETTINGS_QUERY } from '@/lib/graphql/tenant-language.queries';
import { applyDocumentDirection } from '@/lib/i18n';
import { LOCALE_SYNCED_KEY } from '@/lib/auth';

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
  // React 19 concurrent-mode safety: defer ME_QUERY until after initial render.
  // Without this guard, urql's graphcache may synchronously dispatch a state
  // update into a parent Layout fiber while this component is still rendering,
  // causing "Cannot update a component while rendering a different component".
  // Same fix pattern: useSrsQueueCount.ts, useCourseNavigation.ts, SRSWidget.tsx.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [meResult] = useQuery<MeQueryResult>({
    query: ME_QUERY,
    pause: !mounted,
  });
  const [tenantLangResult] = useQuery<TenantLanguageSettingsResult>({
    query: MY_TENANT_LANGUAGE_SETTINGS_QUERY,
    pause: !mounted,
  });
  const [{ fetching }, updatePreferences] = useMutation(
    UPDATE_USER_PREFERENCES_MUTATION
  );

  const availableLocales = (tenantLangResult.data?.myTenantLanguageSettings
    ?.supportedLanguages ?? SUPPORTED_LOCALES) as readonly SupportedLocale[];

  const tenantDefault = (tenantLangResult.data?.myTenantLanguageSettings
    ?.defaultLanguage ?? 'en') as SupportedLocale;

  // Current locale is the ACTIVE i18n language (what the user sees right now).
  // We use i18n.language as the source of truth — it reflects both:
  // - initI18n() startup (from localStorage)
  // - GlobalLocaleSync (DB-sourced, fresh sessions)
  // - setLocale() (user's explicit selection on this page)
  const currentLocale = i18n.language as SupportedLocale;

  // Sync DB locale → i18next for the SETTINGS PAGE.
  // BUG-091: Also sync after fresh login (sessionStorage flag cleared by auth.ts).
  useEffect(() => {
    const dbLocale = meResult.data?.me?.preferences?.locale;
    if (!dbLocale) return;
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(dbLocale)) return;

    const cachedLocale = localStorage.getItem('edusphere_locale');
    const alreadySynced = sessionStorage.getItem(LOCALE_SYNCED_KEY) === 'true';

    const needsSync =
      dbLocale !== i18n.language && (!cachedLocale || !alreadySynced);

    if (needsSync) {
      void i18n.changeLanguage(dbLocale as SupportedLocale);
      localStorage.setItem('edusphere_locale', dbLocale);
      applyDocumentDirection(dbLocale);
    }

    if (!alreadySynced) {
      sessionStorage.setItem(LOCALE_SYNCED_KEY, 'true');
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

      // Persist to DB (background)
      const result = await updatePreferences({ input: { locale } });

      if (result.error) {
        // DB mutation failed — keep the localStorage/i18n change (user can see it)
        // but log the error and rethrow so SettingsPage can show a toast.
        // The locale stays in localStorage and will be re-synced to DB when backend recovers.
        console.error(
          `[useUserPreferences] Failed to persist locale "${locale}" to DB (will retry on next session):`,
          result.error.message
        );
        throw result.error;
      }
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
