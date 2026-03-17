import { z } from 'zod';

// Inline SUPPORTED_LOCALES to avoid ESM/CJS interop issues with @edusphere/i18n
// Keep in sync with packages/i18n/src/index.ts
const SUPPORTED_LOCALES = [
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

const USER_ROLES = [
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'INSTRUCTOR',
  'RESEARCHER',
  'STUDENT',
] as const;

export const CreateUserInputSchema = z.object({
  email: z.string().email('Valid email is required'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(USER_ROLES).default('STUDENT'),
  tenantId: z.string().uuid().optional(),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const UpdateUserInputSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

export const UpdateUserPreferencesSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});

export type UpdateUserPreferencesInput = z.infer<
  typeof UpdateUserPreferencesSchema
>;
