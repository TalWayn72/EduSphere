import { describe, it, expect } from 'vitest';
import { injectLocale } from './locale-prompt';

const BASE_PROMPT = 'You are an educational AI assistant.';

describe('injectLocale()', () => {
  it('returns prompt unchanged for English', () => {
    expect(injectLocale(BASE_PROMPT, 'en')).toBe(BASE_PROMPT);
  });

  it('returns prompt unchanged for unknown locale', () => {
    expect(injectLocale(BASE_PROMPT, 'xx-UNKNOWN')).toBe(BASE_PROMPT);
  });

  it('returns prompt unchanged for empty string locale', () => {
    expect(injectLocale(BASE_PROMPT, '')).toBe(BASE_PROMPT);
  });

  it('appends Spanish instruction for "es"', () => {
    const result = injectLocale(BASE_PROMPT, 'es');
    expect(result).toContain(BASE_PROMPT);
    expect(result).toContain('Spanish');
    expect(result).not.toBe(BASE_PROMPT);
  });

  it('appends French instruction for "fr"', () => {
    const result = injectLocale(BASE_PROMPT, 'fr');
    expect(result).toContain('French');
    expect(result).toContain(BASE_PROMPT);
  });

  it('appends Chinese instruction for "zh-CN"', () => {
    const result = injectLocale(BASE_PROMPT, 'zh-CN');
    expect(result).toContain('Chinese');
    expect(result).toContain(BASE_PROMPT);
  });

  it('appends Hindi instruction for "hi"', () => {
    const result = injectLocale(BASE_PROMPT, 'hi');
    expect(result).toContain('Hindi');
  });

  it('appends Bengali instruction for "bn"', () => {
    const result = injectLocale(BASE_PROMPT, 'bn');
    expect(result).toContain('Bengali');
  });

  it('appends Portuguese instruction for "pt"', () => {
    const result = injectLocale(BASE_PROMPT, 'pt');
    expect(result).toContain('Portuguese');
  });

  it('appends Russian instruction for "ru"', () => {
    const result = injectLocale(BASE_PROMPT, 'ru');
    expect(result).toContain('Russian');
  });

  it('appends Indonesian instruction for "id"', () => {
    const result = injectLocale(BASE_PROMPT, 'id');
    expect(result).toContain('Indonesian');
  });

  it('separates original prompt from instruction with double newline', () => {
    const result = injectLocale(BASE_PROMPT, 'fr');
    expect(result).toContain(`${BASE_PROMPT}\n\n`);
  });

  it('preserves original prompt content', () => {
    const longPrompt =
      'You are an expert AI tutor.\n\nFocus on Socratic questioning.';
    const result = injectLocale(longPrompt, 'es');
    expect(result).toContain(longPrompt);
  });

  it('handles empty system prompt', () => {
    const result = injectLocale('', 'es');
    expect(result).toContain('Spanish');
  });

  // Native-script keyword assertions (task spec requirement)
  it('appends Chinese native-script keyword for "zh-CN"', () => {
    expect(injectLocale(BASE_PROMPT, 'zh-CN')).toContain('中文');
  });

  it('appends Hindi native-script keyword for "hi"', () => {
    expect(injectLocale(BASE_PROMPT, 'hi')).toContain('हिन्दी');
  });

  it('appends Spanish native-script keyword for "es"', () => {
    expect(injectLocale(BASE_PROMPT, 'es')).toContain('Español');
  });

  it('appends French native-script keyword for "fr"', () => {
    expect(injectLocale(BASE_PROMPT, 'fr')).toContain('Français');
  });

  it('appends Bengali native-script keyword for "bn"', () => {
    expect(injectLocale(BASE_PROMPT, 'bn')).toContain('বাংলা');
  });

  it('appends Portuguese native-script keyword for "pt"', () => {
    expect(injectLocale(BASE_PROMPT, 'pt')).toContain('Português');
  });

  it('appends Russian native-script keyword for "ru"', () => {
    expect(injectLocale(BASE_PROMPT, 'ru')).toContain('Русский');
  });

  it('appends Indonesian native-script keyword for "id"', () => {
    expect(injectLocale(BASE_PROMPT, 'id')).toContain('Bahasa Indonesia');
  });

  it('returns prompt unchanged for "xx-YY" (unsupported variant)', () => {
    expect(injectLocale(BASE_PROMPT, 'xx-YY')).toBe(BASE_PROMPT);
  });

  it('handles multi-line base prompt', () => {
    const multiLine = 'Line 1.\nLine 2.\nLine 3.';
    const result = injectLocale(multiLine, 'es');
    expect(result.startsWith(multiLine)).toBe(true);
    expect(result).toContain('Español');
  });

  it('covers all 8 non-English locales with native-script keywords', () => {
    const cases: [string, string][] = [
      ['zh-CN', '中文'],
      ['hi', 'हिन्दी'],
      ['es', 'Español'],
      ['fr', 'Français'],
      ['bn', 'বাংলা'],
      ['pt', 'Português'],
      ['ru', 'Русский'],
      ['id', 'Bahasa Indonesia'],
    ];
    for (const [locale, keyword] of cases) {
      expect(injectLocale(BASE_PROMPT, locale)).toContain(keyword);
    }
  });
});
