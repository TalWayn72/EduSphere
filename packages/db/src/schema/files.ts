import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  bigint,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  uploadedBy: uuid('uploaded_by')
    .notNull()
    .references(() => users.id),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  url: text('url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const filesRLS = sql`
CREATE POLICY files_tenant_isolation ON files
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
`;

export const filesIndexes = sql`
CREATE INDEX idx_files_tenant ON files(tenant_id);
CREATE INDEX idx_files_uploader ON files(uploaded_by);
CREATE INDEX idx_files_mime ON files(mime_type);
`;

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
