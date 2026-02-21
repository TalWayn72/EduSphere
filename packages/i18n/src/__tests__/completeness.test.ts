import { describe, it, expect } from 'vitest';
import { SUPPORTED_LOCALES, NAMESPACES } from '../index';
import * as fs from 'fs';
import * as path from 'path';

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null && !Array.isArray(v)
      ? getAllKeys(v as Record<string, unknown>, fullKey)
      : [fullKey];
  });
}

const localesDir = path.join(__dirname, '..', 'locales');

describe('Translation completeness — no missing keys vs English', () => {
  for (const ns of NAMESPACES) {
    const enPath = path.join(localesDir, 'en', `${ns}.json`);
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf-8')) as Record<string, unknown>;
    const enKeys = getAllKeys(enContent);

    for (const locale of SUPPORTED_LOCALES.filter((l) => l !== 'en')) {
      it(`[${locale}] ${ns} has all keys present in en/${ns}.json`, () => {
        const localePath = path.join(localesDir, locale, `${ns}.json`);
        const localeContent = JSON.parse(fs.readFileSync(localePath, 'utf-8')) as Record<string, unknown>;
        const localeKeys = getAllKeys(localeContent);
        const missing = enKeys.filter((k) => !localeKeys.includes(k));
        expect(missing, `Missing keys in ${locale}/${ns}.json: ${missing.join(', ')}`).toHaveLength(0);
      });
    }
  }
});
