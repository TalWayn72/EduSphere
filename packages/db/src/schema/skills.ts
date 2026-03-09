/**
 * Skills-Based Learning Paths — Phase 44 DB Schema
 *
 * Tables:
 *  - skills: global skill taxonomy (shared across tenants)
 *  - skill_paths: curated ordered skill sequences per tenant
 *  - learner_skill_progress: per-learner mastery tracking with xAPI evidence
 *  - skill_prerequisites: DAG of prerequisite relationships between skills
 *
 * RLS:
 *  - skills: read-only for all authenticated users; no tenant isolation needed
 *  - skill_paths: tenant-scoped; instructors/admins can write
 *  - learner_skill_progress: tenant + user isolation (SI-1: app.current_user_id)
 *  - skill_prerequisites: read-only for all authenticated users
 *
 * Security Invariant SI-1: uses app.current_user_id (NOT app.current_user)
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  json,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId } from './_shared';

// ---------------------------------------------------------------------------
// skills — global taxonomy (tenant-independent)
// ---------------------------------------------------------------------------

export const skills = pgTable(
  'skills',
  {
    id: pk(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category').notNull(),
    level: integer('level').notNull().default(1),
    parentSkillId: uuid('parent_skill_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_skills_category').on(t.category),
    index('idx_skills_level').on(t.level),
    index('idx_skills_parent').on(t.parentSkillId),
  ]
);

// ---------------------------------------------------------------------------
// skill_prerequisites — DAG edges (global, read-only for all users)
// ---------------------------------------------------------------------------

export const skillPrerequisites = pgTable(
  'skill_prerequisites',
  {
    id: pk(),
    skillId: uuid('skill_id').notNull(),
    prerequisiteSkillId: uuid('prerequisite_skill_id').notNull(),
  },
  (t) => [
    unique('skill_prerequisites_unique').on(t.skillId, t.prerequisiteSkillId),
    index('idx_skill_prereqs_skill').on(t.skillId),
    index('idx_skill_prereqs_prereq').on(t.prerequisiteSkillId),
  ]
);

// ---------------------------------------------------------------------------
// skill_paths — tenant-scoped curated sequences
// ---------------------------------------------------------------------------

export const skillPaths = pgTable(
  'skill_paths',
  {
    id: pk(),
    tenantId: tenantId(),
    title: text('title').notNull(),
    description: text('description'),
    targetRole: text('target_role'),
    skillIds: json('skill_ids').notNull().default([]),
    estimatedHours: integer('estimated_hours'),
    isPublished: boolean('is_published').notNull().default(false),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_skill_paths_tenant').on(t.tenantId),
    index('idx_skill_paths_published').on(t.tenantId, t.isPublished),
    index('idx_skill_paths_created_by').on(t.createdBy),
  ]
);

// ---------------------------------------------------------------------------
// learner_skill_progress — per-learner mastery with xAPI evidence
// ---------------------------------------------------------------------------

export const learnerSkillProgress = pgTable(
  'learner_skill_progress',
  {
    id: pk(),
    tenantId: tenantId(),
    userId: uuid('user_id').notNull(),
    skillId: uuid('skill_id').notNull(),
    masteryLevel: text('mastery_level').notNull().default('NONE'),
    evidenceCount: integer('evidence_count').notNull().default(0),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    xapiRegistrationId: uuid('xapi_registration_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('learner_skill_progress_unique').on(t.tenantId, t.userId, t.skillId),
    index('idx_learner_skill_progress_user').on(t.tenantId, t.userId),
    index('idx_learner_skill_progress_skill').on(t.tenantId, t.skillId),
    index('idx_learner_skill_progress_mastery').on(t.masteryLevel),
  ]
);

// ---------------------------------------------------------------------------
// RLS SQL for tables not using pgPolicy inline
// ---------------------------------------------------------------------------

export const skillPathsRLS = sql`
ALTER TABLE skill_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY skill_paths_tenant_isolation ON skill_paths
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND (
      current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
    )
  );
`;

export const learnerSkillProgressRLS = sql`
ALTER TABLE learner_skill_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY learner_skill_progress_user_isolation ON learner_skill_progress
  FOR ALL
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND user_id::text = current_setting('app.current_user_id', TRUE)
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND user_id::text = current_setting('app.current_user_id', TRUE)
  );
`;

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;

export type SkillPrerequisite = typeof skillPrerequisites.$inferSelect;
export type NewSkillPrerequisite = typeof skillPrerequisites.$inferInsert;

export type SkillPath = typeof skillPaths.$inferSelect;
export type NewSkillPath = typeof skillPaths.$inferInsert;

export type LearnerSkillProgress = typeof learnerSkillProgress.$inferSelect;
export type NewLearnerSkillProgress = typeof learnerSkillProgress.$inferInsert;
