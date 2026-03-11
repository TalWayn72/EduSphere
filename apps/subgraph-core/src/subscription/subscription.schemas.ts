/**
 * subscription.schemas.ts — Zod validation schemas for subscription/pilot mutations.
 *
 * SC-02 (T-01): All free-text pilot form fields are sanitized to strip HTML tags,
 * preventing stored XSS in the admin pilot review UI (PilotRequestsAdminPage).
 * The admin UI renders org_name, contact_name, and use_case in table cells;
 * without sanitization, an attacker could inject <script> tags or event handlers
 * that execute in the SUPER_ADMIN's browser context.
 *
 * Mitigation: strip all HTML using replace(/<[^>]*>/g, '') before DB insert.
 * This is the server-side equivalent of DOMPurify with allowedTags: [].
 */
import { z } from 'zod';

/**
 * SC-02: Strip all HTML tags from a string.
 * Prevents stored XSS when user-supplied pilot form data is displayed in admin UI.
 */
const stripHtml = (val: string): string =>
  val.replace(/<[^>]*>/g, '').trim();

export const OrgTypeEnum = z.enum([
  'UNIVERSITY',
  'COLLEGE',
  'CORPORATE',
  'GOVERNMENT',
  'DEFENSE',
]);

/**
 * PilotSignupSchema — validates and sanitizes requestPilot mutation input.
 * SC-02: HTML-strips institutionName, contactName, useCase to prevent XSS.
 * T-15: Enforces max 2000 chars on useCase to prevent memory exhaustion.
 */
export const PilotSignupSchema = z.object({
  // SC-02: strip HTML tags from institutionName (org_name) to prevent stored XSS
  institutionName: z.string().min(2).max(255).transform(stripHtml),
  orgType: OrgTypeEnum,
  // SC-02: strip HTML tags from contactName to prevent stored XSS
  contactName: z.string().min(2).max(255).transform(stripHtml),
  contactEmail: z.string().email().max(255),
  contactPhone: z.string().max(50).optional().transform((v) => (v ? stripHtml(v) : v)),
  estimatedUsers: z.number().int().min(1).max(100_000),
  // SC-02 + T-15: max 2000 chars + strip HTML on useCase (use_case) field
  useCase: z.string().min(10).max(2000).transform(stripHtml),
  adminFirstName: z.string().min(1).max(100).transform(stripHtml),
  adminLastName: z.string().min(1).max(100).transform(stripHtml),
  requestedSeatLimit: z.number().int().min(1).max(50_000).optional(),
});

export type PilotSignupInput = z.infer<typeof PilotSignupSchema>;

// Re-export billing schemas for convenience
export {
  PilotRequestSchema,
  ApprovePilotSchema,
  RejectPilotSchema,
} from '../billing/billing.schemas.js';
