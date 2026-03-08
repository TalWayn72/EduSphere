import { pgTable, uuid, text, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const onboardingState = pgTable('onboarding_state', {
  userId: uuid('user_id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  role: text('role').notNull(),
  currentStep: integer('current_step').notNull().default(1),
  totalSteps: integer('total_steps').notNull().default(5),
  completed: boolean('completed').notNull().default(false),
  skipped: boolean('skipped').notNull().default(false),
  data: jsonb('data').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
