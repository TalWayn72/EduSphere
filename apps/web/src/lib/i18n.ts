import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  NAMESPACES,
  RTL_LOCALES,
} from '@edusphere/i18n';

// Custom backend: lazy-loads namespace JSONs via Vite's dynamic import()
// Vite resolves these at build time via the workspace package
const ViteLocaleBackend = {
  type: 'backend' as const,
  init() {},
  async read(
    language: string,
    namespace: string,
    callback: (err: unknown, data: unknown) => void
  ): Promise<void> {
    try {
      // Dynamic import resolved by Vite from @edusphere/i18n workspace package
      // eslint-disable-next-line no-unsanitized/method
      const module = await import(
        /* @vite-ignore */
        `../../node_modules/@edusphere/i18n/src/locales/${language}/${namespace}.json`
      );
      callback(null, module.default ?? module);
    } catch {
      // Graceful fallback to English if translation missing
      try {
        // eslint-disable-next-line no-unsanitized/method
        const fallback = await import(
          /* @vite-ignore */
          `../../node_modules/@edusphere/i18n/src/locales/en/${namespace}.json`
        );
        callback(null, fallback.default ?? fallback);
      } catch (err) {
        callback(err, null);
      }
    }
  },
};

/** Sets document.dir and document.lang based on the active locale */
export function applyDocumentDirection(locale: string): void {
  const dir = RTL_LOCALES.has(locale as 'he') ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = locale;
}

export async function initI18n(initialLocale?: string): Promise<void> {
  if (i18n.isInitialized) return; // Guard against double-init in React strict mode
  await i18n
    .use(ViteLocaleBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      supportedLngs: [...SUPPORTED_LOCALES],
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: 'common',
      ns: [...NAMESPACES],
      lng: initialLocale,
      interpolation: { escapeValue: false }, // React XSS-escapes by default
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        lookupLocalStorage: 'edusphere_locale',
      },
      load: 'currentOnly', // Prevent loading 'en' when 'en-US' is detected
    });
}

export { i18n };
