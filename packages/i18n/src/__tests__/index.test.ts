import { describe, it, expect } from 'vitest';
import { SUPPORTED_LOCALES, LOCALE_LABELS, NAMESPACES, DEFAULT_LOCALE } from '../index';
import * as fs from 'fs';
import * as path from 'path';

describe('packages/i18n exports', () => {
  it('exports exactly 9 supported locales', () => {
    expect(SUPPORTED_LOCALES).toHaveLength(9);
    expect(SUPPORTED_LOCALES).toContain('en');
    expect(SUPPORTED_LOCALES).toContain('zh-CN');
    expect(SUPPORTED_LOCALES).toContain('hi');
    expect(SUPPORTED_LOCALES).toContain('es');
    expect(SUPPORTED_LOCALES).toContain('fr');
    expect(SUPPORTED_LOCALES).toContain('bn');
    expect(SUPPORTED_LOCALES).toContain('pt');
    expect(SUPPORTED_LOCALES).toContain('ru');
    expect(SUPPORTED_LOCALES).toContain('id');
  });

  it('default locale is English', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('LOCALE_LABELS covers all supported locales with required fields', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const label = LOCALE_LABELS[locale];
      expect(label).toBeDefined();
      expect(typeof label.native).toBe('string');
      expect(label.native.length).toBeGreaterThan(0);
      expect(typeof label.english).toBe('string');
      expect(typeof label.flag).toBe('string');
    }
  });

  it('exports exactly 12 namespaces', () => {
    expect(NAMESPACES).toHaveLength(12);
  });

  it('all locale directories exist with all 12 namespace files', () => {
    const localesDir = path.join(__dirname, '..', 'locales');
    for (const locale of SUPPORTED_LOCALES) {
      for (const ns of NAMESPACES) {
        const filePath = path.join(localesDir, locale, `${ns}.json`);
        expect(fs.existsSync(filePath), `Missing: ${locale}/${ns}.json`).toBe(true);
      }
    }
  });
});
