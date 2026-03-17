import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  NAMESPACES,
  RTL_LOCALES,
} from '@edusphere/i18n';

// Vite pre-discovers all locale JSON files at build time via import.meta.glob.
// Keys are relative paths like "../../../../packages/i18n/src/locales/en/common.json".
// Values are lazy loaders — called only when the locale/namespace is needed.
const localeModules = import.meta.glob<Record<string, unknown>>(
  '../../../../packages/i18n/src/locales/**/*.json'
);

/** Find a glob entry matching the given language + namespace */
function findLocaleModule(lang: string, ns: string) {
  return Object.entries(localeModules).find(
    ([key]) => key.includes(`/${lang}/${ns}.json`)
  );
}

// Custom backend: lazy-loads namespace JSONs via Vite's import.meta.glob
const ViteLocaleBackend = {
  type: 'backend' as const,
  init() {},
  async read(
    language: string,
    namespace: string,
    callback: (err: unknown, data: unknown) => void
  ): Promise<void> {
    try {
      const entry = findLocaleModule(language, namespace);
      if (entry) {
        const module = await entry[1]();
        callback(null, (module as { default?: unknown }).default ?? module);
        return;
      }
      // Fallback to English if requested locale not found
      const fallback = findLocaleModule('en', namespace);
      if (fallback) {
        const module = await fallback[1]();
        callback(null, (module as { default?: unknown }).default ?? module);
        return;
      }
      callback(new Error(`Missing locale: ${language}/${namespace}`), null);
    } catch (err) {
      callback(err, null);
    }
  },
};

/**
 * Sets document.dir and document.lang based on the active locale.
 * WCAG 3.1.1 — both attributes must be kept in sync on every locale change.
 * The <html lang="en"> default in index.html is the static baseline; this
 * function overrides it dynamically whenever the user switches language.
 */
export function applyDocumentDirection(locale: string): void {
  const dir = RTL_LOCALES.has(locale as 'he') ? 'rtl' : 'ltr';
  // Set dir first to minimise layout shift
  document.documentElement.setAttribute('dir', dir);
  // WCAG 3.1.1: lang must reflect the current locale at all times
  document.documentElement.setAttribute('lang', locale);
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
        // Detection order for first-time visitors (no localStorage key yet).
        // localStorage is checked first so it takes priority over browser language.
        order: ['localStorage', 'navigator', 'htmlTag'],
        // IMPORTANT: Do NOT cache to localStorage here. We manage the
        // 'edusphere_locale' key explicitly in setLocale() and GlobalLocaleSync.
        // Allowing LanguageDetector to write would race-condition our explicit writes.
        caches: [],
        lookupLocalStorage: 'edusphere_locale',
      },
      load: 'currentOnly', // Prevent loading 'en' when 'en-US' is detected
    });
}

export { i18n };
