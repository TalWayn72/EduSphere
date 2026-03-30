// ── react-i18next mock ──────────────────────────────────────────────────────
// Load real English translation JSON files so t('key') returns the actual
// English string (e.g. t('title') -> "AI Learning Agents"), matching what
// component tests assert against.

import { vi } from 'vitest';

import adminEn from '../../../../packages/i18n/src/locales/en/admin.json';
import agentsEn from '../../../../packages/i18n/src/locales/en/agents.json';
import annotationsEn from '../../../../packages/i18n/src/locales/en/annotations.json';
import authEn from '../../../../packages/i18n/src/locales/en/auth.json';
import collaborationEn from '../../../../packages/i18n/src/locales/en/collaboration.json';
import commonEn from '../../../../packages/i18n/src/locales/en/common.json';
import contentEn from '../../../../packages/i18n/src/locales/en/content.json';
import coursesEn from '../../../../packages/i18n/src/locales/en/courses.json';
import dashboardEn from '../../../../packages/i18n/src/locales/en/dashboard.json';
import errorsEn from '../../../../packages/i18n/src/locales/en/errors.json';
import knowledgeEn from '../../../../packages/i18n/src/locales/en/knowledge.json';
import navEn from '../../../../packages/i18n/src/locales/en/nav.json';
import settingsEn from '../../../../packages/i18n/src/locales/en/settings.json';
import gamificationEn from '../../../../packages/i18n/src/locales/en/gamification.json';
import offlineEn from '../../../../packages/i18n/src/locales/en/offline.json';
import profileEn from '../../../../packages/i18n/src/locales/en/profile.json';
import socialEn from '../../../../packages/i18n/src/locales/en/social.json';
import srsEn from '../../../../packages/i18n/src/locales/en/srs.json';
import orgOnboardingEn from '../../../../packages/i18n/src/locales/en/orgOnboarding.json';
import orgAdminEn from '../../../../packages/i18n/src/locales/en/orgAdmin.json';
import orgBrandingEn from '../../../../packages/i18n/src/locales/en/orgBranding.json';
import orgMarketplaceEn from '../../../../packages/i18n/src/locales/en/orgMarketplace.json';
import orgAnalyticsEn from '../../../../packages/i18n/src/locales/en/orgAnalytics.json';
import orgGamificationEn from '../../../../packages/i18n/src/locales/en/orgGamification.json';
import orgApiEn from '../../../../packages/i18n/src/locales/en/orgApi.json';

type TranslationRecord = Record<string, unknown>;

const EN_RESOURCES: Record<string, TranslationRecord> = {
  admin: adminEn as TranslationRecord,
  agents: agentsEn as TranslationRecord,
  annotations: annotationsEn as TranslationRecord,
  auth: authEn as TranslationRecord,
  collaboration: collaborationEn as TranslationRecord,
  common: commonEn as TranslationRecord,
  content: contentEn as TranslationRecord,
  courses: coursesEn as TranslationRecord,
  dashboard: dashboardEn as TranslationRecord,
  errors: errorsEn as TranslationRecord,
  gamification: gamificationEn as TranslationRecord,
  knowledge: knowledgeEn as TranslationRecord,
  nav: navEn as TranslationRecord,
  offline: offlineEn as TranslationRecord,
  profile: profileEn as TranslationRecord,
  settings: settingsEn as TranslationRecord,
  social: socialEn as TranslationRecord,
  srs: srsEn as TranslationRecord,
  orgOnboarding: orgOnboardingEn as TranslationRecord,
  orgAdmin: orgAdminEn as TranslationRecord,
  orgBranding: orgBrandingEn as TranslationRecord,
  orgMarketplace: orgMarketplaceEn as TranslationRecord,
  orgAnalytics: orgAnalyticsEn as TranslationRecord,
  orgGamification: orgGamificationEn as TranslationRecord,
  orgApi: orgApiEn as TranslationRecord,
};

/** Resolve a dot-notation key path inside a translation object. */
function resolvePath(
  obj: TranslationRecord,
  keyPath: string
): string | undefined {
  const parts = keyPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as TranslationRecord)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/** Resolve a dot-notation key path, returning any value (arrays, objects, strings). */
function resolvePathAny(
  obj: TranslationRecord,
  keyPath: string
): unknown {
  const parts = keyPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as TranslationRecord)[part];
  }
  return current;
}

/** Apply simple {{variable}} interpolation. */
function interpolate(template: string, vars?: Record<string, unknown>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`
  );
}

/**
 * Resolve a key in a given dict, supporting i18next plural suffix conventions.
 * When `count` is provided, tries `key_one` (count === 1) or `key_other` first,
 * then falls back to the base key.
 */
function resolveWithPlurals(
  dict: TranslationRecord,
  keyPath: string,
  count: number | undefined
): string | undefined {
  if (count !== undefined) {
    const pluralSuffix = count === 1 ? '_one' : '_other';
    const pluralKey = `${keyPath}${pluralSuffix}`;
    const pluralValue = resolvePath(dict, pluralKey);
    if (pluralValue !== undefined) return pluralValue;
  }
  return resolvePath(dict, keyPath);
}

/**
 * Build a t() function that resolves keys from the given namespace(s).
 * Supports "namespace:key" prefix, dot-notation, {{variable}} interpolation,
 * and i18next plural suffix conventions (_one / _other based on count option).
 */
function makeTFunction(ns: string | string[]) {
  const namespaces = Array.isArray(ns) ? ns : [ns];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (key: string, optionsOrDefault?: string | Record<string, unknown>): any => {
    const defaultString = typeof optionsOrDefault === 'string' ? optionsOrDefault : undefined;
    const options = typeof optionsOrDefault === 'object' ? optionsOrDefault : undefined;
    let resolveKey = key;
    let resolveNs = namespaces;
    const count =
      typeof options?.count === 'number' ? options.count : undefined;
    const returnObjects = options?.returnObjects === true;

    if (key.includes(':')) {
      const colonIdx = key.indexOf(':');
      resolveNs = [key.slice(0, colonIdx)];
      resolveKey = key.slice(colonIdx + 1);
    }

    if (returnObjects) {
      for (const namespace of resolveNs) {
        const dict = EN_RESOURCES[namespace];
        if (dict) {
          const value = resolvePathAny(dict, resolveKey);
          if (value !== undefined) return value;
        }
      }
      if (!resolveNs.includes('common')) {
        const commonDict = EN_RESOURCES['common'];
        if (commonDict) {
          const value = resolvePathAny(commonDict, resolveKey);
          if (value !== undefined) return value;
        }
      }
      return options?.defaultValue ?? resolveKey;
    }

    for (const namespace of resolveNs) {
      const dict = EN_RESOURCES[namespace];
      if (dict) {
        const value = resolveWithPlurals(dict, resolveKey, count);
        if (value !== undefined) {
          return interpolate(value, options as Record<string, unknown>);
        }
      }
    }

    if (!resolveNs.includes('common')) {
      const commonDict = EN_RESOURCES['common'];
      if (commonDict) {
        const value = resolveWithPlurals(commonDict, resolveKey, count);
        if (value !== undefined) {
          return interpolate(value, options as Record<string, unknown>);
        }
      }
    }

    const optDefaultValue = typeof options?.defaultValue === 'string' ? options.defaultValue : undefined;
    return defaultString ?? optDefaultValue ?? resolveKey;
  };
}

vi.mock('react-i18next', () => ({
  useTranslation: (ns: string | string[] = 'common') => ({
    t: makeTFunction(ns),
    i18n: {
      changeLanguage: vi.fn().mockResolvedValue(undefined),
      language: 'en',
      isInitialized: true,
      dir: vi.fn().mockReturnValue('ltr'),
    },
    ready: true,
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));
