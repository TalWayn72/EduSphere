import { z } from 'zod';

// Inline SUPPORTED_LOCALES to avoid ESM/CJS interop issues with @edusphere/i18n
// Keep in sync with packages/i18n/src/index.ts
const SUPPORTED_LOCALES = [
  'en', 'zh-CN', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id', 'he',
] as const;

export const UpdateUserPreferencesSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});

export type UpdateUserPreferencesInput = z.infer<typeof UpdateUserPreferencesSchema>;
