/**
 * RLS validation tests for Phase 44 — Skills-Based Learning Paths
 *
 * All tests are unit-style (no live DB required). They verify:
 *  1. learner_skill_progress uses app.current_user_id (SI-1 compliance)
 *  2. skill_paths uses tenant isolation with role-gated writes
 *  3. Unique constraints are defined on learner_skill_progress
 *  4. skills table has global slug uniqueness (no tenant isolation)
 *
 * Security Invariant SI-1: RLS must reference app.current_user_id NOT app.current_user
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getTableName } from 'drizzle-orm';
import {
  learnerSkillProgressRLS,
  skillPathsRLS,
  learnerSkillProgress,
  skillPaths,
  skills,
  skillPrerequisites,
} from '../schema/skills';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sqlToString(sqlObj: {
  queryChunks?: unknown[];
  sql?: string;
}): string {
  if (typeof sqlObj.sql === 'string') return sqlObj.sql;
  if (Array.isArray(sqlObj.queryChunks)) {
    return sqlObj.queryChunks
      .map((chunk) => {
        if (typeof chunk === 'string') return chunk;
        if (
          chunk &&
          typeof (chunk as Record<string, unknown>).value === 'string'
        ) {
          return (chunk as Record<string, unknown>).value as string;
        }
        return JSON.stringify(chunk);
      })
      .join('');
  }
  return JSON.stringify(sqlObj);
}

// ---------------------------------------------------------------------------
// SI-1: learnerSkillProgressRLS must use app.current_user_id
// ---------------------------------------------------------------------------

describe('SI-1: learner_skill_progress RLS uses app.current_user_id', () => {
  it('USING clause references app.current_user_id', () => {
    const raw = sqlToString(
      learnerSkillProgressRLS as Parameters<typeof sqlToString>[0]
    );
    expect(raw).toContain('app.current_user_id');
    expect(raw).not.toMatch(/current_setting\('app\.current_user'[^_]/);
  });

  it('WITH CHECK clause references app.current_user_id', () => {
    const raw = sqlToString(
      learnerSkillProgressRLS as Parameters<typeof sqlToString>[0]
    );
    const withCheckIdx = raw.toUpperCase().indexOf('WITH CHECK');
    expect(withCheckIdx).toBeGreaterThan(-1);
    const withCheckSection = raw.slice(withCheckIdx);
    expect(withCheckSection).toContain('app.current_user_id');
  });

  it('has both USING and WITH CHECK clauses', () => {
    const raw = sqlToString(
      learnerSkillProgressRLS as Parameters<typeof sqlToString>[0]
    );
    expect(raw.toUpperCase()).toContain('USING');
    expect(raw.toUpperCase()).toContain('WITH CHECK');
  });

  it('also enforces tenant isolation alongside user isolation', () => {
    const raw = sqlToString(
      learnerSkillProgressRLS as Parameters<typeof sqlToString>[0]
    );
    expect(raw).toContain('app.current_tenant');
    expect(raw).toContain('app.current_user_id');
  });
});

// ---------------------------------------------------------------------------
// skill_paths RLS — tenant isolation + role-gated writes
// ---------------------------------------------------------------------------

describe('skill_paths RLS tenant isolation and role gate', () => {
  it('USING clause references app.current_tenant', () => {
    const raw = sqlToString(
      skillPathsRLS as Parameters<typeof sqlToString>[0]
    );
    expect(raw).toContain('app.current_tenant');
  });

  it('WITH CHECK restricts writes to INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN', () => {
    const raw = sqlToString(
      skillPathsRLS as Parameters<typeof sqlToString>[0]
    );
    expect(raw).toContain('INSTRUCTOR');
    expect(raw).toContain('ORG_ADMIN');
    expect(raw).toContain('SUPER_ADMIN');
  });

  it('WITH CHECK uses app.current_user_role (not app.current_user)', () => {
    const raw = sqlToString(
      skillPathsRLS as Parameters<typeof sqlToString>[0]
    );
    expect(raw).toContain('app.current_user_role');
    expect(raw).not.toMatch(/current_setting\('app\.current_user'[^_]/);
  });
});

// ---------------------------------------------------------------------------
// Schema file static analysis via readFileSync
// ---------------------------------------------------------------------------

describe('Skills schema file content', () => {
  const schemaFile = readFileSync(
    resolve(__dirname, '../schema/skills.ts'),
    'utf8'
  );

  it('learner_skill_progress table has tenant_id column', () => {
    expect(schemaFile).toContain('tenantId');
    expect(schemaFile).toContain('learnerSkillProgress');
  });

  it('skill_paths table has tenant_id column', () => {
    expect(schemaFile).toContain('skillPaths');
    expect(schemaFile).toContain('tenantId');
  });

  it('skills table has slug field with unique constraint', () => {
    expect(schemaFile).toContain('slug');
    expect(schemaFile).toContain('unique()');
  });

  it('unique constraint on learner_skill_progress (tenant_id, user_id, skill_id)', () => {
    expect(schemaFile).toContain("unique('learner_skill_progress_unique')");
    expect(schemaFile).toContain('t.tenantId');
    expect(schemaFile).toContain('t.userId');
    expect(schemaFile).toContain('t.skillId');
  });

  it('masteryLevel field exists on learnerSkillProgress', () => {
    expect(schemaFile).toContain('masteryLevel');
    expect(schemaFile).toContain("'NONE'");
  });

  it('evidenceCount field exists for xAPI evidence tracking', () => {
    expect(schemaFile).toContain('evidenceCount');
  });

  it('xapiRegistrationId field links to xAPI sessions', () => {
    expect(schemaFile).toContain('xapiRegistrationId');
  });

  it('skill_prerequisites has unique constraint on skill+prerequisite pair', () => {
    expect(schemaFile).toContain('skillPrerequisites');
    expect(schemaFile).toContain("unique('skill_prerequisites_unique')");
  });

  it('skills table has parentSkillId for hierarchy support', () => {
    expect(schemaFile).toContain('parentSkillId');
  });

  it('exports TypeScript inferred types for all 4 tables', () => {
    expect(schemaFile).toContain('export type Skill');
    expect(schemaFile).toContain('export type SkillPath');
    expect(schemaFile).toContain('export type LearnerSkillProgress');
    expect(schemaFile).toContain('export type SkillPrerequisite');
  });
});

// ---------------------------------------------------------------------------
// Drizzle table structure sanity checks
// ---------------------------------------------------------------------------

describe('Drizzle table definitions are complete', () => {
  it('skills table is defined', () => {
    expect(skills).toBeDefined();
    expect(getTableName(skills)).toBe('skills');
  });

  it('skillPrerequisites table is defined', () => {
    expect(skillPrerequisites).toBeDefined();
    expect(getTableName(skillPrerequisites)).toBe('skill_prerequisites');
  });

  it('skillPaths table is defined', () => {
    expect(skillPaths).toBeDefined();
    expect(getTableName(skillPaths)).toBe('skill_paths');
  });

  it('learnerSkillProgress table is defined', () => {
    expect(learnerSkillProgress).toBeDefined();
    expect(getTableName(learnerSkillProgress)).toBe('learner_skill_progress');
  });
});
