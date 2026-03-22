/**
 * OrgSignupWizard Zod schema — shared validation for all 3 steps.
 */
import { z } from 'zod';

const RESERVED_SLUGS = [
  'admin', 'api', 'www', 'mail', 'support', 'app', 'dashboard',
  'help', 'docs', 'status', 'billing', 'login', 'signup',
];

export const orgSignupSchema = z.object({
  // Step 1: Account
  adminName: z.string().min(2, 'Name must be at least 2 characters').max(200),
  adminEmail: z.string().email('Please enter a valid email').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  tosAccepted: z.literal(true, {
    message: 'You must accept the Terms of Service',
  }),
  gdprConsent: z.boolean().optional(),

  // Step 2: Organization Details
  orgName: z.string().min(2, 'Organization name is required').max(255),
  slug: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      'Slug must be lowercase letters, numbers, and hyphens only',
    )
    .refine((s) => !RESERVED_SLUGS.includes(s), {
      message: 'This subdomain is reserved',
    }),
  orgType: z.string().min(1, 'Please select an organization type'),
  orgSize: z.string().optional(),

  // Step 3: Branding
  logoFile: z.instanceof(File).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
    .optional(),
  tagline: z.string().max(120).optional(),
});

export type OrgSignupFormData = z.infer<typeof orgSignupSchema>;

/** Per-step validation schemas for partial validation. */
export const stepSchemas = [
  orgSignupSchema.pick({
    adminName: true,
    adminEmail: true,
    password: true,
    tosAccepted: true,
    gdprConsent: true,
  }),
  orgSignupSchema.pick({
    orgName: true,
    slug: true,
    orgType: true,
    orgSize: true,
  }),
  orgSignupSchema.pick({
    logoFile: true,
    primaryColor: true,
    tagline: true,
  }),
] as const;
