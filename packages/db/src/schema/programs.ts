/**
 * Stackable Credentials / Nanodegrees (F-026)
 *
 * Tables:
 *  - credential_programs   — program definition with required course list
 *  - program_enrollments   — user enrollment + completion tracking
 *  - program_prerequisites — prerequisite program chains
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Main program definition ──────────────────────────────────────────────────

export const credentialPrograms = pgTable(
  'credential_programs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    badgeEmoji: text('badge_emoji').notNull().default('🎓'),
    requiredCourseIds: uuid('required_course_ids')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    totalHours: integer('total_hours').notNull().default(0),
    published: boolean('published').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('credential_programs_tenant_idx').on(t.tenantId),
    publishedIdx: index('credential_programs_published_idx').on(t.tenantId, t.published),
  }),
);

// ─── User enrollment in a program ────────────────────────────────────────────

export const programEnrollments = pgTable(
  'program_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    programId: uuid('program_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    certificateId: uuid('certificate_id'),
  },
  (t) => ({
    userProgramUnique: uniqueIndex('program_enrollments_user_program_unique').on(
      t.userId,
      t.programId,
    ),
    userIdx: index('program_enrollments_user_idx').on(t.userId),
    tenantIdx: index('program_enrollments_tenant_idx').on(t.tenantId),
  }),
);

// ─── Prerequisite relationships between programs ──────────────────────────────

export const programPrerequisites = pgTable(
  'program_prerequisites',
  {
    programId: uuid('program_id').notNull(),
    prerequisiteProgramId: uuid('prerequisite_program_id').notNull(),
  },
  (t) => ({
    pk: uniqueIndex('program_prerequisites_pk').on(t.programId, t.prerequisiteProgramId),
  }),
);

// ─── RLS policies ─────────────────────────────────────────────────────────────

export const programsRLS = sql`
-- credential_programs: tenant can see published programs; admins see all
CREATE POLICY credential_programs_tenant_isolation ON credential_programs
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND (
      published = TRUE
      OR current_setting('app.current_user_role', TRUE) IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
  );

ALTER TABLE credential_programs ENABLE ROW LEVEL SECURITY;

-- program_enrollments: users see own; admins see all within tenant
CREATE POLICY program_enrollments_tenant_isolation ON program_enrollments
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND (
      user_id::text = current_setting('app.current_user_id', TRUE)
      OR current_setting('app.current_user_role', TRUE) IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
  );

ALTER TABLE program_enrollments ENABLE ROW LEVEL SECURITY;

-- program_prerequisites: readable by all authenticated users in tenant
CREATE POLICY program_prerequisites_read ON program_prerequisites
  FOR SELECT
  USING (TRUE);

ALTER TABLE program_prerequisites ENABLE ROW LEVEL SECURITY;
`;

// ─── TypeScript types ─────────────────────────────────────────────────────────

export type CredentialProgram = typeof credentialPrograms.$inferSelect;
export type NewCredentialProgram = typeof credentialPrograms.$inferInsert;
export type ProgramEnrollment = typeof programEnrollments.$inferSelect;
export type NewProgramEnrollment = typeof programEnrollments.$inferInsert;
export type ProgramPrerequisite = typeof programPrerequisites.$inferSelect;
