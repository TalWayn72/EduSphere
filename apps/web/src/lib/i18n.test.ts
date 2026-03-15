import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LOCALES,
  NAMESPACES,
  RTL_LOCALES,
  DEFAULT_LOCALE,
} from '@edusphere/i18n';
import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(
  __dirname,
  '../../../../packages/i18n/src/locales'
);

/** Recursively collect all leaf keys from a nested object (dot-separated). */
function flatKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys.sort();
}

function loadJson(locale: string, ns: string): Record<string, unknown> {
  const filePath = path.join(LOCALES_DIR, locale, `${ns}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<
    string,
    unknown
  >;
}

// ---------------------------------------------------------------------------
// 1. Completeness — every locale has every namespace JSON
// ---------------------------------------------------------------------------
describe('i18n translation files', () => {
  describe('completeness — all locale/namespace files exist and are valid', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const ns of NAMESPACES) {
        it(`${locale}/${ns}.json exists and has at least 1 key`, () => {
          const filePath = path.join(LOCALES_DIR, locale, `${ns}.json`);
          expect(
            fs.existsSync(filePath),
            `Missing: ${locale}/${ns}.json`
          ).toBe(true);

          const content = loadJson(locale, ns);
          expect(Object.keys(content).length).toBeGreaterThan(0);
        });
      }
    }
  });

  // -------------------------------------------------------------------------
  // 2. Total file count matches 10 locales x 15 namespaces = 150
  // -------------------------------------------------------------------------
  describe('file count', () => {
    it('has exactly 10 locales x 15 namespaces = 150 JSON files', () => {
      expect(SUPPORTED_LOCALES).toHaveLength(10);
      expect(NAMESPACES).toHaveLength(15);

      let count = 0;
      for (const locale of SUPPORTED_LOCALES) {
        const dir = path.join(LOCALES_DIR, locale);
        const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
        count += files.length;
      }
      expect(count).toBe(150);
    });
  });

  // -------------------------------------------------------------------------
  // 3. settings namespace has ALL keys used by SettingsPage
  // -------------------------------------------------------------------------
  describe('settings namespace — SettingsPage keys present', () => {
    const REQUIRED_SETTINGS_KEYS = [
      'title',
      'language.title',
      'language.description',
      'language.saved',
      'language.error',
      'language.saving',
      'storage.title',
      'storage.description',
      'storage.clearCache',
      'storage.used',
      'storage.limitOf',
    ];

    for (const locale of SUPPORTED_LOCALES) {
      it(`${locale}/settings.json has all SettingsPage keys`, () => {
        const content = loadJson(locale, 'settings');
        const keys = flatKeys(content);

        for (const required of REQUIRED_SETTINGS_KEYS) {
          expect(
            keys,
            `${locale}/settings.json missing key: ${required}`
          ).toContain(required);
        }
      });
    }
  });

  // -------------------------------------------------------------------------
  // 4. Hebrew parity — every English key exists in Hebrew
  // -------------------------------------------------------------------------
  describe('Hebrew (he) has every key that English (en) has', () => {
    for (const ns of NAMESPACES) {
      it(`he/${ns}.json has all keys from en/${ns}.json`, () => {
        const enContent = loadJson('en', ns);
        const heContent = loadJson('he', ns);

        const enKeys = flatKeys(enContent);
        const heKeys = flatKeys(heContent);

        const missing = enKeys.filter((k) => !heKeys.includes(k));
        expect(
          missing,
          `he/${ns}.json is missing keys: ${missing.join(', ')}`
        ).toEqual([]);
      });
    }
  });

  // -------------------------------------------------------------------------
  // 5. RTL locales correctly identified
  // -------------------------------------------------------------------------
  describe('RTL locale identification', () => {
    it('Hebrew (he) is marked as RTL', () => {
      expect(RTL_LOCALES.has('he')).toBe(true);
    });

    it('English (en) is NOT marked as RTL', () => {
      expect(RTL_LOCALES.has('en' as never)).toBe(false);
    });

    it('RTL_LOCALES only contains expected locales', () => {
      // Currently only Hebrew is RTL; Arabic would be added if supported
      expect([...RTL_LOCALES]).toEqual(['he']);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Default locale is English
  // -------------------------------------------------------------------------
  describe('default locale', () => {
    it('DEFAULT_LOCALE is "en"', () => {
      expect(DEFAULT_LOCALE).toBe('en');
    });
  });
});
