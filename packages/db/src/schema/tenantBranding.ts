import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const tenantBranding = pgTable('tenant_branding', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull()
    .unique(),
  logoUrl: varchar('logo_url', { length: 512 })
    .notNull()
    .default('/defaults/logo.svg'),
  logoMarkUrl: varchar('logo_mark_url', { length: 512 }),
  faviconUrl: varchar('favicon_url', { length: 512 })
    .notNull()
    .default('/defaults/favicon.ico'),
  primaryColor: varchar('primary_color', { length: 7 })
    .notNull()
    .default('#2563eb'),
  secondaryColor: varchar('secondary_color', { length: 7 })
    .notNull()
    .default('#64748b'),
  accentColor: varchar('accent_color', { length: 7 })
    .notNull()
    .default('#f59e0b'),
  backgroundColor: varchar('background_color', { length: 7 })
    .notNull()
    .default('#ffffff'),
  fontFamily: varchar('font_family', { length: 100 })
    .notNull()
    .default('Inter'),
  organizationName: varchar('organization_name', { length: 200 }).notNull(),
  tagline: varchar('tagline', { length: 500 }),
  privacyPolicyUrl: varchar('privacy_policy_url', { length: 512 }),
  termsOfServiceUrl: varchar('terms_of_service_url', { length: 512 }),
  supportEmail: varchar('support_email', { length: 200 }),
  hideEduSphereBranding: boolean('hide_edusphere_branding')
    .notNull()
    .default(false),
  customCss: text('custom_css'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type TenantBranding = typeof tenantBranding.$inferSelect;
export type NewTenantBranding = typeof tenantBranding.$inferInsert;
