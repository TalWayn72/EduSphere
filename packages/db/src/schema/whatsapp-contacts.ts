/**
 * WhatsApp contacts — Phase 65 Social & Notification Integration.
 * Stores user WhatsApp opt-in, encrypted phone numbers (SI-3), verification status.
 * RLS: users see own record only; ORG_ADMIN/SUPER_ADMIN see tenant-wide.
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  varchar,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const userWhatsappContacts = pgTable(
  'user_whatsapp_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    /** Phone number encrypted with encryptField() per SI-3 */
    phoneNumber: text('phone_number').notNull(),
    phoneCountryCode: varchar('phone_country_code', { length: 5 }).notNull(),
    whatsappConsent: boolean('whatsapp_consent').notNull().default(false),
    consentGivenAt: timestamp('consent_given_at', { withTimezone: true }),
    verified: boolean('verified').notNull().default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    /** OTP code hash for verification (never store plaintext) */
    otpHash: text('otp_hash'),
    otpExpiresAt: timestamp('otp_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('whatsapp_contacts_user_unique').on(t.tenantId, t.userId),
    pgPolicy('whatsapp_contacts_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          user_id::text = current_setting('app.current_user_id', TRUE)
          OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
        )
      `,
      withCheck: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND user_id::text = current_setting('app.current_user_id', TRUE)
      `,
    }),
  ]
).enableRLS();

export type UserWhatsappContact = typeof userWhatsappContacts.$inferSelect;
export type NewUserWhatsappContact = typeof userWhatsappContacts.$inferInsert;
