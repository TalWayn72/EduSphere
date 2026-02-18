import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  website: varchar('website', { length: 255 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const organizationsRLS = sql`
CREATE POLICY orgs_tenant_isolation ON organizations
  USING (id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (id::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
`;

export const organizationsIndexes = sql`
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active);
`;

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
