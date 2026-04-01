/**
 * LanguageSettingsPage locale data and shared types.
 */

export const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

export interface Locale {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
}

export const AVAILABLE_LOCALES: Locale[] = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  {
    code: 'he',
    name: 'Hebrew',
    nativeName: '\u05E2\u05D1\u05E8\u05D9\u05EA',
    rtl: true,
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629',
    rtl: true,
  },
  {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '\u4E2D\u6587\uFF08\u7B80\u4F53\uFF09',
    rtl: false,
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: '\u0939\u093F\u0928\u094D\u0926\u0940',
    rtl: false,
  },
  { code: 'es', name: 'Spanish', nativeName: 'Espa\u00F1ol', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Fran\u00E7ais', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugu\u00EAs', rtl: false },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
    rtl: false,
  },
  {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    rtl: false,
  },
];

export interface LanguageSettings {
  supportedLanguages: string[];
  defaultLanguage: string;
}

export interface QueryResult {
  myTenantLanguageSettings: LanguageSettings | null;
}
