/**
 * Zod validation schemas for org onboarding mutations.
 */
import { z } from 'zod';

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(3)
    .max(63)
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      'Slug must be lowercase alphanumeric with hyphens, cannot start/end with hyphen'
    ),
  adminEmail: z.string().email(),
  adminFirstName: z.string().min(1).max(100),
  adminLastName: z.string().min(1).max(100),
  idempotencyKey: z.string().uuid(),
});

export const InviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ORG_ADMIN', 'INSTRUCTOR', 'STUDENT']),
  message: z.string().max(500).optional(),
});

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(200),
  scopes: z
    .array(
      z.enum([
        'courses:read',
        'courses:write',
        'users:read',
        'users:write',
        'analytics:read',
        'content:read',
        'content:write',
        'webhooks:manage',
      ])
    )
    .min(1),
  rateLimitPerMinute: z.number().int().min(1).max(10000).optional().default(60),
  expiresAt: z.string().datetime().optional(),
});

export const CreateWebhookSchema = z.object({
  url: z.string().url().startsWith('https://'),
  events: z
    .array(
      z.enum([
        'course.completed',
        'course.enrolled',
        'badge.issued',
        'user.invited',
        'user.joined',
        'org.provisioned',
        'license.activated',
      ])
    )
    .min(1),
});

export const UpdateWebhookSchema = z.object({
  url: z.string().url().startsWith('https://').optional(),
  events: z
    .array(
      z.enum([
        'course.completed',
        'course.enrolled',
        'badge.issued',
        'user.invited',
        'user.joined',
        'org.provisioned',
        'license.activated',
      ])
    )
    .min(1)
    .optional(),
  isActive: z.boolean().optional(),
});

export const LicenseCourseSchema = z.object({
  courseId: z.string().uuid(),
  licenseType: z.enum(['UNLIMITED', 'PER_SEAT', 'TIME_LIMITED']),
  maxSeats: z.number().int().min(1).optional(),
  durationMonths: z.number().int().min(1).max(120).optional(),
});

export const CreateOrgBadgeSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional().nullable(),
  iconUrl: z.string().url().optional().nullable().or(z.literal('')),
  xpRequired: z.number().int().min(0),
  autoAwardCriteria: z
    .object({
      type: z.enum(['COURSE_COMPLETE', 'XP_THRESHOLD', 'STREAK_DAYS', 'QUIZ_SCORE']),
      courseId: z.string().uuid().optional(),
      amount: z.number().int().min(0).optional(),
      count: z.number().int().min(1).optional(),
      minScore: z.number().min(0).max(100).optional(),
    })
    .optional()
    .nullable(),
});

export const UpdateOrgBadgeSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  iconUrl: z.string().url().optional().nullable().or(z.literal('')),
  xpRequired: z.number().int().min(0).optional(),
  autoAwardCriteria: z
    .object({
      type: z.enum(['COURSE_COMPLETE', 'XP_THRESHOLD', 'STREAK_DAYS', 'QUIZ_SCORE']),
      courseId: z.string().uuid().optional(),
      amount: z.number().int().min(0).optional(),
      count: z.number().int().min(1).optional(),
      minScore: z.number().min(0).max(100).optional(),
    })
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
});

export const UpdateGamificationConfigSchema = z.object({
  enabled: z.boolean().optional(),
  showLeaderboard: z.boolean().optional(),
  showBadges: z.boolean().optional(),
  showPoints: z.boolean().optional(),
  showStreaks: z.boolean().optional(),
  xpRules: z.record(z.string(), z.number().int().min(0)).optional(),
  leaderboardScope: z.enum(['TENANT', 'DEPARTMENT', 'GLOBAL']).optional(),
});

export const DateRangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export const ExportAnalyticsSchema = z.object({
  format: z.enum(['CSV', 'PDF']),
  dateRange: DateRangeSchema,
});
