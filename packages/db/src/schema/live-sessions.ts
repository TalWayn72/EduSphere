import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { contentItems } from './contentItems';

export const liveSessionStatusEnum = pgEnum('live_session_status', [
  'SCHEDULED',
  'LIVE',
  'ENDED',
  'RECORDING',
  'CANCELLED',
]);

export const liveSessions = pgTable('live_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentItemId: uuid('content_item_id')
    .notNull()
    .references(() => contentItems.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  bbbMeetingId: text('bbb_meeting_id').notNull().unique(),
  meetingName: text('meeting_name').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  recordingUrl: text('recording_url'),
  // SI-3: These fields MUST be stored encrypted. Service layer MUST call
  // encryptField(value, tenantKey) before INSERT and decryptField() on SELECT.
  // Column stores AES-256-GCM ciphertext (base64-encoded), NOT plaintext.
  attendeePasswordEnc: text('attendee_password_enc').notNull(),
  moderatorPasswordEnc: text('moderator_password_enc').notNull(),
  status: liveSessionStatusEnum('status').notNull().default('SCHEDULED'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const liveSessionsRLS = sql`
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY live_sessions_tenant_isolation ON live_sessions
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));
`;

export const liveSessionsIndexes = sql`
CREATE UNIQUE INDEX idx_live_sessions_bbb_meeting ON live_sessions(bbb_meeting_id);
CREATE INDEX idx_live_sessions_content_item ON live_sessions(content_item_id);
CREATE INDEX idx_live_sessions_tenant ON live_sessions(tenant_id);
CREATE INDEX idx_live_sessions_status ON live_sessions(status);
`;

export type LiveSession = typeof liveSessions.$inferSelect;
export type NewLiveSession = typeof liveSessions.$inferInsert;
