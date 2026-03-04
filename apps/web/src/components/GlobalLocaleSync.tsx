import { useEffect } from 'react';
import { useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@edusphere/i18n';
import { ME_QUERY } from '@/lib/queries';
import { applyDocumentDirection } from '@/lib/i18n';

interface MeQueryResult {
  me: {
    id: string;
    preferences: {
      locale: string;
    };
  } | null;
}

/**
 * GlobalLocaleSync — syncs the user's DB-stored locale to i18next on every page.
 *
 * Problem solved: `useUserPreferences` is only used in SettingsPage, so the
 * DB locale was never applied on other pages. This component runs globally
 * (rendered in App.tsx inside UrqlProvider) and handles the "fresh session"
 * case where localStorage is empty but the DB has a saved locale.
 *
 * Rules:
 * 1. If localStorage has a locale (user explicitly set it in this browser),
 *    trust it. initI18n() already applied it on startup.
 * 2. If localStorage is empty (fresh session / cleared cache), apply the
 *    DB locale. Save it to localStorage so subsequent refreshes are fast.
 * 3. If DB locale is invalid / not in SUPPORTED_LOCALES, do nothing.
 *
 * Renders nothing — purely a sync side-effect component.
 */
export function GlobalLocaleSync() {
  const { i18n } = useTranslation();
  const [meResult] = useQuery<MeQueryResult>({ query: ME_QUERY });

  useEffect(() => {
    const dbLocale = meResult.data?.me?.preferences?.locale;
    if (!dbLocale) return;

    // Validate that the DB locale is a supported locale
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(dbLocale)) {
      console.error(
        `[GlobalLocaleSync] DB locale "${dbLocale}" is not in SUPPORTED_LOCALES — skipping sync`
      );
      return;
    }

    const cachedLocale = localStorage.getItem('edusphere_locale');

    if (!cachedLocale) {
      // No localStorage → fresh session (cleared cache, new device, incognito).
      // Trust the DB locale as the user's authoritative preference.
      if (dbLocale !== i18n.language) {
        void i18n.changeLanguage(dbLocale as SupportedLocale);
        localStorage.setItem('edusphere_locale', dbLocale);
        applyDocumentDirection(dbLocale);
      }
    }
    // If localStorage IS set, initI18n() already applied it on startup.
    // Don't override — localStorage represents the current session's intent.
  }, [meResult.data?.me?.preferences?.locale, i18n]);

  return null;
}
