import { pgTable, text, uuid, timestamp, unique, customType } from 'drizzle-orm/pg-core';
import { pk, tenantId, timestamps } from './_shared';
import { tenants } from './tenants';
import { users } from './core';

// Custom bytea type for CRDT binary data
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

// Collaboration Documents
export const collab_documents = pgTable('collab_documents', {
  id: pk(),
  tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
  entity_type: text('entity_type', {
    enum: ['ANNOTATION', 'COURSE_NOTES', 'SHARED_CANVAS']
  }).notNull(),
  entity_id: uuid('entity_id').notNull(),
  name: text('name').notNull(),
  ydoc_snapshot: bytea('ydoc_snapshot'),
  ...timestamps,
}, (table) => ({
  entity_unique: unique().on(table.entity_type, table.entity_id),
}));

// CRDT Updates
export const crdt_updates = pgTable('crdt_updates', {
  id: pk(),
  document_id: uuid('document_id').notNull().references(() => collab_documents.id, { onDelete: 'cascade' }),
  update_data: bytea('update_data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Collaboration Sessions
export const collab_sessions = pgTable('collab_sessions', {
  id: pk(),
  document_id: uuid('document_id').notNull().references(() => collab_documents.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  connection_id: text('connection_id').notNull().unique(),
  last_active: timestamp('last_active', { withTimezone: true }).notNull().defaultNow(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CollabDocument = typeof collab_documents.$inferSelect;
export type NewCollabDocument = typeof collab_documents.$inferInsert;
export type CRDTUpdate = typeof crdt_updates.$inferSelect;
export type NewCRDTUpdate = typeof crdt_updates.$inferInsert;
export type CollabSession = typeof collab_sessions.$inferSelect;
export type NewCollabSession = typeof collab_sessions.$inferInsert;
