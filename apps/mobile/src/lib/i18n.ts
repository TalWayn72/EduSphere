import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, NAMESPACES } from '@edusphere/i18n';

const LOCALE_KEY = 'edusphere_locale';

// Metro bundler resolves require() paths at bundle time.
// IMPORTANT: Do NOT use dynamic import() here — Metro does not support it for JSON.
const MetroLocaleBackend = {
  type: 'backend' as const,
  init() {},
  read(
    language: string,
    namespace: string,
    callback: (err: unknown, data: unknown) => void,
  ) {
    try {
      // Metro resolves this glob pattern at bundle time across all locale/namespace combos
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const data: unknown = require(`@edusphere/i18n/src/locales/${language}/${namespace}.json`);
      callback(null, data);
    } catch {
      try {
        // Fallback to English
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fallback: unknown = require(`@edusphere/i18n/src/locales/en/${namespace}.json`);
        callback(null, fallback);
      } catch (err) {
        callback(err, null);
      }
    }
  },
};

export async function initMobileI18n(): Promise<void> {
  if (i18n.isInitialized) return;
  const stored = await AsyncStorage.getItem(LOCALE_KEY).catch(() => null);
  await i18n
    .use(MetroLocaleBackend)
    .use(initReactI18next)
    .init({
      supportedLngs: [...SUPPORTED_LOCALES],
      fallbackLng: DEFAULT_LOCALE,
      lng: stored ?? undefined,
      defaultNS: 'common',
      ns: [...NAMESPACES],
      interpolation: { escapeValue: false },
    });
}

export async function saveMobileLocale(locale: string): Promise<void> {
  await AsyncStorage.setItem(LOCALE_KEY, locale);
  await i18n.changeLanguage(locale);
}

export { i18n };
