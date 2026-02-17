import { pgTable, text, uuid, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId, timestamps } from './_shared';
import { tenants } from './tenants';
import { users } from './core';

// Enums
export const discussionTypeEnum = pgEnum('discussion_type', ['FORUM', 'CHAVRUTA', 'DEBATE']);
export const messageTypeEnum = pgEnum('message_type', ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO']);

// Discussions table
export const discussions = pgTable('discussions', {
  id: pk(),
  tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
  course_id: uuid('course_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  creator_id: uuid('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  discussion_type: discussionTypeEnum('discussion_type').notNull().default('FORUM'),
  ...timestamps,
});

// Discussion messages table
export const discussion_messages = pgTable('discussion_messages', {
  id: pk(),
  discussion_id: uuid('discussion_id').notNull().references(() => discussions.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  message_type: messageTypeEnum('message_type').notNull().default('TEXT'),
  parent_message_id: uuid('parent_message_id'),
  ...timestamps,
});

// Discussion participants table
export const discussion_participants = pgTable('discussion_participants', {
  id: pk(),
  discussion_id: uuid('discussion_id').notNull().references(() => discussions.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joined_at: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
});

// RLS policies
export const discussionsRLS = sql`
  CREATE POLICY discussions_tenant_isolation ON discussions
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

  ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
`;

export const discussionMessagesRLS = sql`
  CREATE POLICY discussion_messages_tenant_isolation ON discussion_messages
    USING (
      EXISTS (
        SELECT 1 FROM discussions
        WHERE discussions.id = discussion_messages.discussion_id
        AND discussions.tenant_id::text = current_setting('app.current_tenant', TRUE)
      )
    );

  ALTER TABLE discussion_messages ENABLE ROW LEVEL SECURITY;
`;

export const discussionParticipantsRLS = sql`
  CREATE POLICY discussion_participants_tenant_isolation ON discussion_participants
    USING (
      EXISTS (
        SELECT 1 FROM discussions
        WHERE discussions.id = discussion_participants.discussion_id
        AND discussions.tenant_id::text = current_setting('app.current_tenant', TRUE)
      )
    );

  ALTER TABLE discussion_participants ENABLE ROW LEVEL SECURITY;
`;

// Indexes
export const discussionsIndexes = sql`
  CREATE INDEX idx_discussions_course ON discussions(course_id);
  CREATE INDEX idx_discussions_creator ON discussions(creator_id);
  CREATE INDEX idx_discussions_type ON discussions(discussion_type);
  CREATE INDEX idx_discussion_messages_discussion ON discussion_messages(discussion_id);
  CREATE INDEX idx_discussion_messages_user ON discussion_messages(user_id);
  CREATE INDEX idx_discussion_messages_parent ON discussion_messages(parent_message_id);
  CREATE INDEX idx_discussion_participants_discussion ON discussion_participants(discussion_id);
  CREATE INDEX idx_discussion_participants_user ON discussion_participants(user_id);
`;

// Types
export type Discussion = typeof discussions.$inferSelect;
export type NewDiscussion = typeof discussions.$inferInsert;
export type DiscussionMessage = typeof discussion_messages.$inferSelect;
export type NewDiscussionMessage = typeof discussion_messages.$inferInsert;
export type DiscussionParticipant = typeof discussion_participants.$inferSelect;
export type NewDiscussionParticipant = typeof discussion_participants.$inferInsert;
