import { describe, it, expect } from 'vitest';
import { UpdateUserPreferencesSchema } from './user.schemas.js';

describe('UpdateUserPreferencesSchema', () => {
  it('accepts a fully populated valid input', () => {
    const result = UpdateUserPreferencesSchema.safeParse({
      locale: 'en',
      theme: 'dark',
      emailNotifications: true,
      pushNotifications: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty object (all fields optional)', () => {
    const result = UpdateUserPreferencesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a partial input with only locale', () => {
    const result = UpdateUserPreferencesSchema.safeParse({ locale: 'fr' });
    expect(result.success).toBe(true);
    expect(result.data?.locale).toBe('fr');
  });

  it('rejects an unknown locale', () => {
    const result = UpdateUserPreferencesSchema.safeParse({
      locale: 'xx-UNKNOWN',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid theme value', () => {
    const result = UpdateUserPreferencesSchema.safeParse({ theme: 'blue' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid theme values', () => {
    for (const theme of ['light', 'dark', 'system'] as const) {
      const result = UpdateUserPreferencesSchema.safeParse({ theme });
      expect(result.success, `Expected theme '${theme}' to be valid`).toBe(true);
    }
  });

  it('rejects a non-boolean emailNotifications', () => {
    const result = UpdateUserPreferencesSchema.safeParse({
      emailNotifications: 'yes',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-boolean pushNotifications', () => {
    const result = UpdateUserPreferencesSchema.safeParse({
      pushNotifications: 1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts all known SUPPORTED_LOCALES', () => {
    const locales = [
      'en', 'zh-CN', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id', 'he',
    ] as const;
    for (const locale of locales) {
      const result = UpdateUserPreferencesSchema.safeParse({ locale });
      expect(result.success, `Expected '${locale}' to be valid`).toBe(true);
    }
  });
});
