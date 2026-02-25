/**
 * Assessment schema — F-030: 360° Multi-Rater Assessments
 * Campaign-based multi-rater feedback: self + peer + manager + direct report
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const assessmentStatusEnum = pgEnum('assessment_status', [
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
]);

export const raterRoleEnum = pgEnum('rater_role', [
  'SELF',
  'PEER',
  'MANAGER',
  'DIRECT_REPORT',
]);

export const assessmentCampaigns = pgTable(
  'assessment_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    courseId: uuid('course_id'),
    targetUserId: uuid('target_user_id').notNull(),
    title: text('title').notNull(),
    rubric: jsonb('rubric').notNull(),
    dueDate: timestamp('due_date'),
    status: assessmentStatusEnum('status').notNull().default('DRAFT'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('assessment_campaigns_tenant_idx').on(t.tenantId),
    targetIdx: index('assessment_campaigns_target_idx').on(t.targetUserId),
    // RLS: target sees own campaigns; instructors/admins see all tenant campaigns
    targetOrAdminPolicy: pgPolicy('assessment_campaigns_rls', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`tenant_id = current_setting('app.current_tenant', TRUE)::uuid
        AND (
          target_user_id = current_setting('app.current_user_id', TRUE)::uuid
          OR current_setting('app.current_role', TRUE) IN ('ORG_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR')
        )`,
    }),
  }),
);

export const assessmentResponses = pgTable(
  'assessment_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').notNull(),
    responderId: uuid('responder_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    raterRole: raterRoleEnum('rater_role').notNull(),
    criteriaScores: jsonb('criteria_scores').notNull(),
    narrative: text('narrative'),
    submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  },
  (t) => ({
    campaignIdx: index('assessment_responses_campaign_idx').on(t.campaignId),
    responderUnique: uniqueIndex('assessment_responses_responder_unique').on(
      t.campaignId,
      t.responderId,
      t.raterRole,
    ),
    // RLS: responder sees own; admins/instructors see all in tenant
    responderOrAdminPolicy: pgPolicy('assessment_responses_rls', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`tenant_id = current_setting('app.current_tenant', TRUE)::uuid
        AND (
          responder_id = current_setting('app.current_user_id', TRUE)::uuid
          OR current_setting('app.current_role', TRUE) IN ('ORG_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR')
        )`,
    }),
  }),
);

export const assessmentResults = pgTable('assessment_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().unique(),
  targetUserId: uuid('target_user_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  aggregatedScores: jsonb('aggregated_scores').notNull(),
  summary: text('summary'),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
});
