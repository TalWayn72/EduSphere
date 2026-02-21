// Vitest global test setup
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './server';

// ── react-i18next mock ──────────────────────────────────────────────────────
// Load real English translation JSON files so t('key') returns the actual
// English string (e.g. t('title') → "AI Learning Agents"), matching what
// component tests assert against.

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

type TranslationRecord = Record<string, unknown>;

const EN_RESOURCES: Record<string, TranslationRecord> = {
  agents: agentsEn as TranslationRecord,
  annotations: annotationsEn as TranslationRecord,
  auth: authEn as TranslationRecord,
  collaboration: collaborationEn as TranslationRecord,
  common: commonEn as TranslationRecord,
  content: contentEn as TranslationRecord,
  courses: coursesEn as TranslationRecord,
  dashboard: dashboardEn as TranslationRecord,
  errors: errorsEn as TranslationRecord,
  knowledge: knowledgeEn as TranslationRecord,
  nav: navEn as TranslationRecord,
  settings: settingsEn as TranslationRecord,
};

/** Resolve a dot-notation key path inside a translation object. */
function resolvePath(obj: TranslationRecord, keyPath: string): string | undefined {
  const parts = keyPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as TranslationRecord)[part];
  }
  return typeof current === 'string' ? current : undefined;
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
  count: number | undefined,
): string | undefined {
  if (count !== undefined) {
    // Try plural-specific key first: _one for count=1, _other otherwise
    const pluralSuffix = count === 1 ? '_one' : '_other';
    const pluralKey = `${keyPath}${pluralSuffix}`;
    const pluralValue = resolvePath(dict, pluralKey);
    if (pluralValue !== undefined) return pluralValue;
  }
  return resolvePath(dict, keyPath);
}

/**
 * Build a t() function that resolves keys from the given namespace(s).
 * Supports:
 *   - "namespace:key" prefix syntax
 *   - dot-notation key paths
 *   - {{variable}} interpolation
 *   - i18next plural suffix conventions (_one / _other based on count option)
 * Falls back to 'common' namespace, then returns the raw key if not found.
 */
function makeTFunction(ns: string | string[]) {
  const namespaces = Array.isArray(ns) ? ns : [ns];

  return (key: string, options?: Record<string, unknown>): string => {
    let resolveKey = key;
    let resolveNs = namespaces;
    const count = typeof options?.count === 'number' ? options.count : undefined;

    // Support "namespace:key" prefix syntax
    if (key.includes(':')) {
      const colonIdx = key.indexOf(':');
      resolveNs = [key.slice(0, colonIdx)];
      resolveKey = key.slice(colonIdx + 1);
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

    // Fallback: try 'common' namespace if not already in list
    if (!resolveNs.includes('common')) {
      const commonDict = EN_RESOURCES['common'];
      if (commonDict) {
        const value = resolveWithPlurals(commonDict, resolveKey, count);
        if (value !== undefined) {
          return interpolate(value, options as Record<string, unknown>);
        }
      }
    }

    // Last resort: return the key itself (without namespace prefix)
    return resolveKey;
  };
}

vi.mock('react-i18next', () => ({
  useTranslation: (ns: string | string[] = 'common') => ({
    t: makeTFunction(ns),
    i18n: {
      changeLanguage: vi.fn().mockResolvedValue(undefined),
      language: 'en',
      isInitialized: true,
    },
    ready: true,
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── MSW server ──────────────────────────────────────────────────────────────

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test (prevent test pollution)
afterEach(() => server.resetHandlers());

// Stop server after all tests
afterAll(() => server.close());
