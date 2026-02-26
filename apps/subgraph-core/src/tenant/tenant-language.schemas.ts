import { z } from 'zod';

// Keep in sync with packages/i18n/src/index.ts SUPPORTED_LOCALES
// Inline to avoid ESM/CJS interop issues with @edusphere/i18n
const KNOWN_LOCALES = [
  'en',
  'zh-CN',
  'hi',
  'es',
  'fr',
  'bn',
  'pt',
  'ru',
  'id',
  'he',
] as const;

export const UpdateTenantLanguageSettingsSchema = z
  .object({
    supportedLanguages: z.array(z.enum(KNOWN_LOCALES)).min(1),
    defaultLanguage: z.enum(KNOWN_LOCALES),
  })
  .refine((d) => d.supportedLanguages.includes(d.defaultLanguage), {
    message: 'defaultLanguage must be in supportedLanguages',
    path: ['defaultLanguage'],
  });

export type UpdateTenantLanguageSettingsInput = z.infer<
  typeof UpdateTenantLanguageSettingsSchema
>;
