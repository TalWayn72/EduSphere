import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  NAMESPACES,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from '../index';
import * as fs from 'fs';
import * as path from 'path';

describe('packages/i18n exports', () => {
  it('exports exactly 10 supported locales', () => {
    expect(SUPPORTED_LOCALES).toHaveLength(10);
    expect(SUPPORTED_LOCALES).toContain('en');
    expect(SUPPORTED_LOCALES).toContain('zh-CN');
    expect(SUPPORTED_LOCALES).toContain('hi');
    expect(SUPPORTED_LOCALES).toContain('es');
    expect(SUPPORTED_LOCALES).toContain('fr');
    expect(SUPPORTED_LOCALES).toContain('bn');
    expect(SUPPORTED_LOCALES).toContain('pt');
    expect(SUPPORTED_LOCALES).toContain('ru');
    expect(SUPPORTED_LOCALES).toContain('id');
    expect(SUPPORTED_LOCALES).toContain('he');
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
        expect(fs.existsSync(filePath), `Missing: ${locale}/${ns}.json`).toBe(
          true
        );
      }
    }
  });
});

describe('SUPPORTED_LOCALES', () => {
  it('contains exactly 10 locales', () => {
    expect(SUPPORTED_LOCALES).toHaveLength(10);
  });

  it('includes English as first locale', () => {
    expect(SUPPORTED_LOCALES[0]).toBe('en');
  });

  it('includes all required locales', () => {
    const required = ['en', 'zh-CN', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id'];
    for (const loc of required) {
      expect(SUPPORTED_LOCALES).toContain(loc);
    }
  });

  it('has no duplicates', () => {
    const unique = new Set(SUPPORTED_LOCALES);
    expect(unique.size).toBe(SUPPORTED_LOCALES.length);
  });
});

describe('DEFAULT_LOCALE', () => {
  it('is "en"', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('is in SUPPORTED_LOCALES', () => {
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
  });
});

describe('NAMESPACES', () => {
  it('contains exactly 12 namespaces', () => {
    expect(NAMESPACES).toHaveLength(12);
  });

  it('includes all required namespaces', () => {
    const required = [
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
    ];
    for (const ns of required) {
      expect(NAMESPACES).toContain(ns);
    }
  });
});

describe('LOCALE_LABELS', () => {
  it('has a label for every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALE_LABELS[locale as SupportedLocale]).toBeDefined();
    }
  });

  it('English label has english field equal to "English"', () => {
    expect(LOCALE_LABELS['en'].english).toBe('English');
  });

  it('English label has native field equal to "English"', () => {
    expect(LOCALE_LABELS['en'].native).toBe('English');
  });

  it('each label has non-empty native and english strings', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const label = LOCALE_LABELS[locale as SupportedLocale];
      expect(typeof label.native).toBe('string');
      expect(label.native.length).toBeGreaterThan(0);
      expect(typeof label.english).toBe('string');
      expect(label.english.length).toBeGreaterThan(0);
    }
  });

  it('each label has a non-empty flag string', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const label = LOCALE_LABELS[locale as SupportedLocale];
      expect(typeof label.flag).toBe('string');
      expect(label.flag.length).toBeGreaterThan(0);
    }
  });
});
