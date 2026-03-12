/**
 * billing.schemas.ts — Zod validation schemas for billing mutations.
 * PilotRequestSchema: validates pilot sign-up form inputs.
 *   SC-02: strips HTML tags from all text fields to prevent stored XSS (T-01).
 *   Fields orgName, contactName, contactPhone, useCase are sanitized via stripHtml.
 * ApprovePilotSchema: validates admin approval inputs.
 */
import { z } from 'zod';

/**
 * SC-02: Strip all HTML tags from a string to prevent stored XSS.
 * Used on user-supplied free-text fields that are later rendered in the admin UI.
 * Equivalent to server-side DOMPurify with allowedTags: [].
 */
const stripHtml = (val: string): string =>
  val.replace(/<[^>]*>/g, '').replace(/</g, '').replace(/>/g, '').trim();

export const OrgTypeEnum = z.enum([
  'UNIVERSITY',
  'COLLEGE',
  'CORPORATE',
  'GOVERNMENT',
  'DEFENSE',
]);

export const PilotRequestSchema = z.object({
  // SC-02: strip HTML tags to prevent stored XSS in admin pilot review UI (T-01)
  orgName: z.string().min(2).max(255).transform(stripHtml),
  orgType: OrgTypeEnum,
  contactName: z.string().min(2).max(255).transform(stripHtml),
  contactEmail: z.string().email().max(255),
  contactPhone: z.string().max(50).optional().transform((v) => (v ? stripHtml(v) : v)),
  estimatedUsers: z.number().int().min(1).max(1_000_000),
  // SC-02: max 2000 chars + strip HTML (T-01, T-15)
  useCase: z.string().min(10).max(2000).transform(stripHtml),
});

export const ApprovePilotSchema = z.object({
  requestId: z.string().uuid(),
  approvedByUserId: z.string().uuid(),
  pilotDurationDays: z.number().int().min(1).max(365).default(90),
});

export const RejectPilotSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().max(1000).optional(),
});

export type PilotRequestInput = z.infer<typeof PilotRequestSchema>;
export type ApprovePilotInput = z.infer<typeof ApprovePilotSchema>;
export type RejectPilotInput = z.infer<typeof RejectPilotSchema>;
