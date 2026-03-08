import { pgTable, uuid, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    managerId: uuid('manager_id').notNull(),
    memberId: uuid('member_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqueManagerMember: uniqueIndex('idx_team_members_unique').on(t.managerId, t.memberId, t.tenantId),
    managerIdx: index('idx_team_members_manager').on(t.managerId, t.tenantId),
    memberIdx: index('idx_team_members_member').on(t.memberId, t.tenantId),
  }),
);

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
