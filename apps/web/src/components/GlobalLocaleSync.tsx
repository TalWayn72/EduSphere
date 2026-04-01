import { useEffect } from 'react';
import { useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@edusphere/i18n';
import { ME_QUERY } from '@/lib/queries';
import { applyDocumentDirection } from '@/lib/i18n';
import { LOCALE_SYNCED_KEY } from '@/lib/auth';

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
 * (rendered in App.tsx inside UrqlProvider) and handles:
 *
 * 1. Fresh sessions (empty localStorage) — applies DB locale.
 * 2. Fresh logins (BUG-091) — after login/logout, sessionStorage sync flag
 *    is cleared by auth.ts, forcing a re-read from DB. This prevents stale
 *    localStorage values from overriding the user's DB-saved preference.
 * 3. If localStorage is set AND already synced this session — trusts it.
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

    // BUG-091: Check if this session has already synced locale from DB.
    // login()/logout() clear this flag, so the first GlobalLocaleSync run
    // after login always re-reads from DB — preventing stale localStorage
    // from overriding the user's saved preference.
    const alreadySynced = sessionStorage.getItem(LOCALE_SYNCED_KEY) === 'true';

    // Only change language when the DB locale actually differs from current.
    // Two cases where we sync:
    //   1. No localStorage (fresh session) AND DB locale differs from i18n
    //   2. Not yet synced this session (BUG-091: fresh login) AND DB differs
    const needsSync =
      dbLocale !== i18n.language && (!cachedLocale || !alreadySynced);

    if (needsSync) {
      void i18n.changeLanguage(dbLocale as SupportedLocale);
      localStorage.setItem('edusphere_locale', dbLocale);
      applyDocumentDirection(dbLocale);
    }

    // Mark as synced so subsequent renders don't override manual changes
    // made via setLocale() on the Settings page.
    if (!alreadySynced) {
      sessionStorage.setItem(LOCALE_SYNCED_KEY, 'true');
    }
  }, [meResult.data?.me?.preferences?.locale, i18n]);

  return null;
}
