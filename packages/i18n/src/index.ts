export const SUPPORTED_LOCALES = [
  'en',
  'zh-CN',
  'hi',
  'es',
  'fr',
  'bn',
  'pt',
  'ru',
  'id',
  'he',
] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Locales that require right-to-left text direction */
export const RTL_LOCALES = new Set<SupportedLocale>(['he']);

export const LOCALE_LABELS: Record<
  SupportedLocale,
  {
    native: string;
    english: string;
    flag: string;
  }
> = {
  en: { native: 'English', english: 'English', flag: '🇬🇧' },
  'zh-CN': { native: '中文', english: 'Chinese', flag: '🇨🇳' },
  hi: { native: 'हिन्दी', english: 'Hindi', flag: '🇮🇳' },
  es: { native: 'Español', english: 'Spanish', flag: '🇪🇸' },
  fr: { native: 'Français', english: 'French', flag: '🇫🇷' },
  bn: { native: 'বাংলা', english: 'Bengali', flag: '🇧🇩' },
  pt: { native: 'Português', english: 'Portuguese', flag: '🇧🇷' },
  ru: { native: 'Русский', english: 'Russian', flag: '🇷🇺' },
  id: { native: 'Bahasa Indonesia', english: 'Indonesian', flag: '🇮🇩' },
  he: { native: 'עברית', english: 'Hebrew', flag: '🇮🇱' },
};

export const NAMESPACES = [
  'common',
  'nav',
  'auth',
  'dashboard',
  'courses',
  'content',
  'annotations',
  'agents',
  'collaboration',
  'knowledge',
  'settings',
  'errors',
  'offline',
  'admin',
] as const;
export type I18nNamespace = (typeof NAMESPACES)[number];
