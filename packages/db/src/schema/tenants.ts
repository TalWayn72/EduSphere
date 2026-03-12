import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { pk, timestamps } from './_shared';

/** Phase 63: No-Code Portal Builder — JSON schema for tenant portal config. */
export interface PortalBlockProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  backgroundColor?: string;
}

export interface PortalBlockEntry {
  id: string;
  type: 'hero' | 'courses' | 'features' | 'cta' | 'testimonials';
  props: PortalBlockProps;
}

export interface PortalConfig {
  blocks: PortalBlockEntry[];
}

export const tenants = pgTable('tenants', {
  id: pk(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan', {
    enum: ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'],
  })
    .notNull()
    .default('FREE'),
  settings: jsonb('settings').notNull().default({}),
  portalConfig: jsonb('portal_config').$type<PortalConfig>().default({ blocks: [] }),
  subscription_expires_at: timestamp('subscription_expires_at', {
    withTimezone: true,
  }),
  ...timestamps,
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
