import { describe, it, expect } from 'vitest';
import { UpdateTenantLanguageSettingsSchema } from './tenant-language.schemas.js';

describe('UpdateTenantLanguageSettingsSchema', () => {
  it('accepts valid input with known locales', () => {
    const result = UpdateTenantLanguageSettingsSchema.safeParse({
      supportedLanguages: ['en', 'fr'],
      defaultLanguage: 'en',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when supportedLanguages is empty', () => {
    const result = UpdateTenantLanguageSettingsSchema.safeParse({
      supportedLanguages: [],
      defaultLanguage: 'en',
    });
    expect(result.success).toBe(false);
    // Zod v4: "Too small: expected array to have >=1 items"
    expect(result.error?.issues[0]?.message).toBeTruthy();
  });

  it('rejects when defaultLanguage is not in supportedLanguages', () => {
    const result = UpdateTenantLanguageSettingsSchema.safeParse({
      supportedLanguages: ['en', 'fr'],
      defaultLanguage: 'he',
    });
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) =>
      i.message.includes('defaultLanguage must be in supportedLanguages')
    );
    expect(issue).toBeDefined();
    expect(issue?.path).toContain('defaultLanguage');
  });

  it('rejects an unknown locale in supportedLanguages', () => {
    const result = UpdateTenantLanguageSettingsSchema.safeParse({
      supportedLanguages: ['en', 'xx-UNKNOWN'],
      defaultLanguage: 'en',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown defaultLanguage even when schema locale list is fine', () => {
    const result = UpdateTenantLanguageSettingsSchema.safeParse({
      supportedLanguages: ['en'],
      defaultLanguage: 'xx-UNKNOWN',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all known SUPPORTED_LOCALES as defaultLanguage', () => {
    const knownLocales = [
      'en', 'zh-CN', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id', 'he',
    ] as const;
    for (const locale of knownLocales) {
      const result = UpdateTenantLanguageSettingsSchema.safeParse({
        supportedLanguages: [locale],
        defaultLanguage: locale,
      });
      expect(result.success, `Expected '${locale}' to be valid`).toBe(true);
    }
  });

  it('rejects missing supportedLanguages field', () => {
    const result = UpdateTenantLanguageSettingsSchema.safeParse({
      defaultLanguage: 'en',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing defaultLanguage field', () => {
    const result = UpdateTenantLanguageSettingsSchema.safeParse({
      supportedLanguages: ['en'],
    });
    expect(result.success).toBe(false);
  });
});
