/**
 * Locale injection utility for AI system prompts.
 * Keeps language instructions out of individual workflow files.
 */

const LANGUAGE_INSTRUCTIONS: Readonly<Record<string, string>> = {
  he: 'Always respond in Hebrew (עברית). Do not switch to English. Write right-to-left.',
  'zh-CN':
    'Always respond in Simplified Chinese (中文). Do not switch to English.',
  hi: 'Always respond in Hindi (हिन्दी). Do not switch to English.',
  es: 'Always respond in Spanish (Español). Do not switch to English.',
  fr: 'Always respond in French (Français). Do not switch to English.',
  bn: 'Always respond in Bengali (বাংলা). Do not switch to English.',
  pt: 'Always respond in Brazilian Portuguese (Português). Do not switch to English.',
  ru: 'Always respond in Russian (Русский). Do not switch to English.',
  id: 'Always respond in Indonesian (Bahasa Indonesia). Do not switch to English.',
};

/**
 * Appends a locale instruction to a system prompt.
 * For English ('en'), the prompt is returned unchanged.
 * For unknown locales, the prompt is returned unchanged (safe fallback).
 */
export function injectLocale(systemPrompt: string, locale: string): string {
  const instruction = LANGUAGE_INSTRUCTIONS[locale];
  return instruction ? `${systemPrompt}\n\n${instruction}` : systemPrompt;
}
