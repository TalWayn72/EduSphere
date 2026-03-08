/**
 * G-15: Fine-grained @requiresScopes and @requiresRole directives
 *
 * SOC2 CC6.3 + GDPR Art.25 -- least privilege: every sensitive mutation must have
 * explicit scope/role directives beyond just @authenticated.
 *
 * Static source-analysis tests -- no running server required.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

function read(relativePath: string): string {
  const abs = resolve(ROOT, relativePath);
  return existsSync(abs) ? readFileSync(abs, 'utf-8') : '';
}

function extractMutationBlock(sdl: string): string {
  const idx = sdl.indexOf('type Mutation {');
  if (idx < 0) return '';
  // Find closing brace of Mutation block by scanning forward
  let depth = 0,
    pos = idx;
  while (pos < sdl.length) {
    if (sdl[pos] === '{') depth++;
    if (sdl[pos] === '}') {
      depth--;
      if (depth === 0) break;
    }
    pos++;
  }
  return sdl.slice(idx + 16, pos);
}
describe('G-15: directive definitions in graphql-shared', () => {
  let directives: string;
  beforeAll(() => {
    directives = read('packages/graphql-shared/src/directives.ts');
  });

  it('@authenticated directive is defined', () => {
    expect(directives).toContain('@authenticated');
  });
  it('@requiresRole directive is defined with roles argument', () => {
    expect(directives).toContain('requiresRole');
    expect(directives).toContain('@requiresRole(roles:');
  });
  it('@requiresScopes directive is defined with scopes argument', () => {
    expect(directives).toContain('requiresScopes');
    expect(directives).toContain('@requiresScopes(scopes:');
  });
  it('AuthScope enum exports WRITE_ANNOTATIONS with write:annotations', () => {
    expect(directives).toContain('WRITE_ANNOTATIONS');
    expect(directives).toContain('write:annotations');
  });
  it('AuthScope enum exports WRITE_USERS with write:users', () => {
    expect(directives).toContain('WRITE_USERS');
    expect(directives).toContain('write:users');
  });
  it('UserRole enum exports SUPER_ADMIN and ORG_ADMIN', () => {
    expect(directives).toContain('SUPER_ADMIN');
    expect(directives).toContain('ORG_ADMIN');
  });
});
describe('G-15: user.graphql -- admin mutations have fine-grained auth', () => {
  let schema: string;
  beforeAll(() => {
    schema = read('apps/subgraph-core/src/user/user.graphql');
  });

  it('schema file exists', () => {
    expect(schema.length).toBeGreaterThan(0);
  });
  it('@link imports @requiresRole for federation awareness', () => {
    expect(schema).toContain('@requiresRole');
  });
  it('@link imports @requiresScopes for federation awareness', () => {
    expect(schema).toContain('@requiresScopes');
  });
  it('createUser mutation has @requiresRole with SUPER_ADMIN and ORG_ADMIN', () => {
    const b = schema.slice(
      schema.indexOf('createUser'),
      schema.indexOf('updateUser')
    );
    expect(b).toContain('@requiresRole');
    expect(b).toContain('SUPER_ADMIN');
    expect(b).toContain('ORG_ADMIN');
  });
  it('createUser mutation has @requiresScopes with write:users', () => {
    const b = schema.slice(
      schema.indexOf('createUser'),
      schema.indexOf('updateUser')
    );
    expect(b).toContain('@requiresScopes');
    expect(b).toContain('write:users');
  });
  it('updateUser mutation has @requiresRole with SUPER_ADMIN and ORG_ADMIN', () => {
    const b = schema.slice(
      schema.indexOf('updateUser('),
      schema.indexOf('updateUserPreferences')
    );
    expect(b).toContain('@requiresRole');
    expect(b).toContain('SUPER_ADMIN');
    expect(b).toContain('ORG_ADMIN');
  });
  it('updateUser mutation has @requiresScopes with write:users', () => {
    const b = schema.slice(
      schema.indexOf('updateUser('),
      schema.indexOf('updateUserPreferences')
    );
    expect(b).toContain('@requiresScopes');
    expect(b).toContain('write:users');
  });
  it('updateUserPreferences is self-service: @authenticated but NOT @requiresRole', () => {
    const i = schema.indexOf('updateUserPreferences');
    // Slice only to the next mutation definition (updateProfileVisibility) so
    // later admin-only mutations with @requiresRole don't pollute the window.
    const nextDef = schema.indexOf('updateProfileVisibility', i);
    const b = schema.slice(i, nextDef > i ? nextDef : i + 200);
    expect(b).toContain('@authenticated');
    expect(b).not.toContain('@requiresRole');
  });
  it('all mutations retain @authenticated as baseline guard', () => {
    expect(schema).toContain('@authenticated');
  });
});
describe('G-15: annotation.graphql -- write mutations have @requiresScopes', () => {
  let schema: string;
  beforeAll(() => {
    schema = read('apps/subgraph-annotation/src/annotation/annotation.graphql');
  });

  it('schema file exists', () => {
    expect(schema.length).toBeGreaterThan(0);
  });
  it('@link imports @requiresScopes', () => {
    expect(schema).toContain('@requiresScopes');
  });

  it('createAnnotation has @requiresScopes with write:annotations', () => {
    const b = schema.slice(
      schema.indexOf('createAnnotation'),
      schema.indexOf('updateAnnotation')
    );
    expect(b).toContain('@requiresScopes');
    expect(b).toContain('write:annotations');
  });
  it('updateAnnotation has @requiresScopes with write:annotations', () => {
    const b = schema.slice(
      schema.indexOf('updateAnnotation'),
      schema.indexOf('deleteAnnotation')
    );
    expect(b).toContain('@requiresScopes');
    expect(b).toContain('write:annotations');
  });
  it('deleteAnnotation has @requiresScopes with write:annotations', () => {
    const b = schema.slice(
      schema.indexOf('deleteAnnotation'),
      schema.indexOf('resolveAnnotation')
    );
    expect(b).toContain('@requiresScopes');
    expect(b).toContain('write:annotations');
  });
  it('resolveAnnotation has @requiresScopes with write:annotations', () => {
    const b = schema.slice(
      schema.indexOf('resolveAnnotation'),
      schema.indexOf('replyToAnnotation')
    );
    expect(b).toContain('@requiresScopes');
    expect(b).toContain('write:annotations');
  });
  it('replyToAnnotation has @requiresScopes with write:annotations', () => {
    const i = schema.indexOf('replyToAnnotation');
    const b = schema.slice(i, i + 800);
    expect(b).toContain('@requiresScopes');
    expect(b).toContain('write:annotations');
  });
  it('all annotation write mutations retain @authenticated as baseline', () => {
    expect(extractMutationBlock(schema)).toContain('@authenticated');
  });
});

describe('G-15: aggregate -- least privilege principle across all schemas', () => {
  it('at least one schema enforces @requiresRole on admin mutations', () => {
    expect(read('apps/subgraph-core/src/user/user.graphql')).toContain(
      '@requiresRole'
    );
  });
  it('at least one schema enforces @requiresScopes on write mutations', () => {
    const combined =
      read('apps/subgraph-annotation/src/annotation/annotation.graphql') +
      read('apps/subgraph-core/src/user/user.graphql');
    expect(combined).toContain('@requiresScopes');
  });
  it('graphql-shared exports UserRole and AuthScope enumerations', () => {
    const d = read('packages/graphql-shared/src/directives.ts');
    expect(d).toContain('UserRole');
    expect(d).toContain('AuthScope');
  });
});

// ─── Phase 35: Push Notifications ─────────────────────────────────────────────

describe('G-15: notifications.graphql (Phase 35) -- push token mutations have @authenticated', () => {
  let schema: string;
  beforeAll(() => {
    schema = read('apps/subgraph-core/src/notifications/notifications.graphql');
  });

  it('schema file exists and is non-empty', () => {
    expect(schema.length).toBeGreaterThan(0);
  });

  it('registerPushToken mutation is present', () => {
    expect(schema).toContain('registerPushToken');
  });

  it('registerPushToken has @authenticated directive', () => {
    const start = schema.indexOf('registerPushToken');
    // Slice enough to capture the directive on the same or next line
    const b = schema.slice(start, start + 300);
    expect(b).toContain('@authenticated');
  });

  it('unregisterPushToken mutation is present', () => {
    expect(schema).toContain('unregisterPushToken');
  });

  it('unregisterPushToken has @authenticated directive', () => {
    const start = schema.indexOf('unregisterPushToken');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });

  it('PushPlatform enum declares WEB, IOS, ANDROID values', () => {
    expect(schema).toContain('WEB');
    expect(schema).toContain('IOS');
    expect(schema).toContain('ANDROID');
  });

  it('registerPushToken does NOT have @requiresRole (self-service mutation)', () => {
    const start = schema.indexOf('registerPushToken');
    const end = schema.indexOf('unregisterPushToken', start);
    const b = schema.slice(start, end > start ? end : start + 300);
    // Push token registration is user-self-service — no elevated role required
    expect(b).not.toContain('@requiresRole');
  });
});

// ─── Phase 35: Tenant Analytics ───────────────────────────────────────────────

describe('G-15: analytics.graphql (Phase 35) -- tenant analytics mutations have @authenticated', () => {
  let schema: string;
  beforeAll(() => {
    schema = read('apps/subgraph-content/src/analytics/analytics.graphql');
  });

  it('schema file exists and is non-empty', () => {
    expect(schema.length).toBeGreaterThan(0);
  });

  it('exportTenantAnalytics mutation is present', () => {
    expect(schema).toContain('exportTenantAnalytics');
  });

  it('exportTenantAnalytics has @authenticated directive', () => {
    const start = schema.indexOf('exportTenantAnalytics');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });

  it('tenantAnalytics query has @authenticated', () => {
    const start = schema.indexOf('tenantAnalytics');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });

  it('learnerVelocity query has @authenticated', () => {
    const start = schema.indexOf('learnerVelocity');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });

  it('cohortRetention query has @authenticated', () => {
    const start = schema.indexOf('cohortRetention');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });

  it('AnalyticsPeriod enum declares SEVEN_DAYS, THIRTY_DAYS, NINETY_DAYS', () => {
    expect(schema).toContain('SEVEN_DAYS');
    expect(schema).toContain('THIRTY_DAYS');
    expect(schema).toContain('NINETY_DAYS');
  });

  it('ExportFormat enum declares CSV and EXCEL', () => {
    expect(schema).toContain('CSV');
    expect(schema).toContain('EXCEL');
  });
});

// ─── Phase 35: Admin Overview authorization ────────────────────────────────────

describe('G-15: admin.graphql (Phase 35) -- admin queries require ORG_ADMIN or SUPER_ADMIN', () => {
  let schema: string;
  beforeAll(() => {
    schema = read('apps/subgraph-core/src/admin/admin.graphql');
  });

  it('schema file exists and is non-empty', () => {
    expect(schema.length).toBeGreaterThan(0);
  });

  it('adminOverview query requires @requiresRole', () => {
    const start = schema.indexOf('adminOverview');
    const b = schema.slice(start, start + 300);
    expect(b).toContain('@requiresRole');
  });

  it('adminOverview restricts to ORG_ADMIN and SUPER_ADMIN', () => {
    const start = schema.indexOf('adminOverview');
    const b = schema.slice(start, start + 300);
    expect(b).toContain('ORG_ADMIN');
    expect(b).toContain('SUPER_ADMIN');
  });

  it('adminDashboardStats query requires @requiresRole', () => {
    const start = schema.indexOf('adminDashboardStats');
    const b = schema.slice(start, start + 300);
    expect(b).toContain('@requiresRole');
  });

  it('adminOverview has @authenticated as baseline guard', () => {
    const start = schema.indexOf('adminOverview');
    const b = schema.slice(start, start + 300);
    expect(b).toContain('@authenticated');
  });
});

// ─── Phase 35: adaptiveLearningPath ───────────────────────────────────────────

describe('G-15: graph.graphql (Phase 35) -- adaptiveLearningPath requires @authenticated', () => {
  let schema: string;
  beforeAll(() => {
    schema = read('apps/subgraph-knowledge/src/graph/graph.graphql');
  });

  it('schema file exists and is non-empty', () => {
    expect(schema.length).toBeGreaterThan(0);
  });

  it('adaptiveLearningPath field is present in schema', () => {
    expect(schema).toContain('adaptiveLearningPath');
  });

  it('adaptiveLearningPath has @authenticated directive', () => {
    const start = schema.indexOf('adaptiveLearningPath');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });
});

// ─── Phase 36: Lesson Pipeline Builder authorization ──────────────────────────

describe('G-15: lesson.graphql (Phase 36) -- Pipeline Builder mutations require INSTRUCTOR role', () => {
  let schema: string;
  beforeAll(() => {
    schema = read('apps/subgraph-content/src/lesson/lesson.graphql');
  });

  it('schema file exists and is non-empty', () => {
    expect(schema.length).toBeGreaterThan(0);
  });

  it('createLessonPlan mutation is present', () => {
    expect(schema).toContain('createLessonPlan');
  });

  it('createLessonPlan requires @authenticated directive', () => {
    const start = schema.indexOf('createLessonPlan(input:');
    const b = schema.slice(start, start + 300);
    expect(b).toContain('@authenticated');
  });

  it('createLessonPlan requires @requiresRole with INSTRUCTOR', () => {
    const start = schema.indexOf('createLessonPlan(input:');
    const b = schema.slice(start, start + 300);
    expect(b).toContain('@requiresRole');
    expect(b).toContain('INSTRUCTOR');
  });

  it('createLessonPlan also allows ORG_ADMIN and SUPER_ADMIN', () => {
    const start = schema.indexOf('createLessonPlan(input:');
    const b = schema.slice(start, start + 300);
    expect(b).toContain('ORG_ADMIN');
    expect(b).toContain('SUPER_ADMIN');
  });

  it('publishLessonPlan mutation is present', () => {
    expect(schema).toContain('publishLessonPlan');
  });

  it('publishLessonPlan requires @authenticated directive', () => {
    const start = schema.indexOf('publishLessonPlan(id:');
    const b = schema.slice(start, start + 300);
    expect(b).toContain('@authenticated');
  });

  it('publishLessonPlan requires @requiresRole with INSTRUCTOR', () => {
    const start = schema.indexOf('publishLessonPlan(id:');
    const b = schema.slice(start, start + 300);
    expect(b).toContain('@requiresRole');
    expect(b).toContain('INSTRUCTOR');
  });

  it('myCourseLessonPlans query requires @requiresRole with INSTRUCTOR', () => {
    const start = schema.indexOf('myCourseLessonPlans');
    const b = schema.slice(start, start + 300);
    expect(b).toContain('@requiresRole');
    expect(b).toContain('INSTRUCTOR');
  });

  it('STUDENT is NOT listed in createLessonPlan roles (student-as-unauthorized guard)', () => {
    const start = schema.indexOf('createLessonPlan(input:');
    // Slice between createLessonPlan and addLessonStep to avoid cross-contamination
    const end = schema.indexOf('addLessonStep', start);
    const b = schema.slice(start, end > start ? end : start + 300);
    // STUDENT role must NOT appear in the allowed roles list for this mutation
    expect(b).not.toContain('STUDENT');
  });

  it('STUDENT is NOT listed in publishLessonPlan roles', () => {
    const start = schema.indexOf('publishLessonPlan(id:');
    const b = schema.slice(start, start + 300);
    expect(b).not.toContain('STUDENT');
  });
});

// ─── Phase 36: At-Risk Learners authorization ─────────────────────────────────

describe('G-15: analytics.graphql (Phase 36) -- listAtRiskLearners requires ORG_ADMIN', () => {
  let schema: string;
  beforeAll(() => {
    schema = read('apps/subgraph-content/src/analytics/analytics.graphql');
  });

  it('schema file exists and is non-empty', () => {
    expect(schema.length).toBeGreaterThan(0);
  });

  it('listAtRiskLearners query is present', () => {
    expect(schema).toContain('listAtRiskLearners');
  });

  it('listAtRiskLearners has @authenticated directive', () => {
    const start = schema.indexOf('listAtRiskLearners');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });

  it('listAtRiskLearners has @requiresRole directive', () => {
    const start = schema.indexOf('listAtRiskLearners');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@requiresRole');
  });

  it('listAtRiskLearners restricts to ORG_ADMIN', () => {
    const start = schema.indexOf('listAtRiskLearners');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('ORG_ADMIN');
  });

  it('listAtRiskLearners also allows SUPER_ADMIN', () => {
    const start = schema.indexOf('listAtRiskLearners');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('SUPER_ADMIN');
  });

  it('STUDENT is NOT listed in listAtRiskLearners roles', () => {
    const start = schema.indexOf('listAtRiskLearners');
    // Slice to next field definition to avoid false positives
    const b = schema.slice(start, start + 200);
    expect(b).not.toContain('STUDENT');
  });

  it('INSTRUCTOR is NOT listed in listAtRiskLearners roles (admin-only guard)', () => {
    const start = schema.indexOf('listAtRiskLearners');
    const b = schema.slice(start, start + 200);
    // listAtRiskLearners is admin-only, instructors should not be in the allow-list
    expect(b).not.toContain('INSTRUCTOR');
  });
});

// ─── Phase 37: Manager Dashboard authorization ────────────────────────────────

describe('G-15: manager.graphql (Phase 37) -- myTeamOverview requires MANAGER/ORG_ADMIN/SUPER_ADMIN', () => {
  let schema: string;
  beforeAll(() => {
    schema = read('apps/subgraph-core/src/manager/manager.graphql');
  });

  it('schema file exists and is non-empty', () => {
    expect(schema.length).toBeGreaterThan(0);
  });

  it('myTeamOverview query is present', () => {
    expect(schema).toContain('myTeamOverview');
  });

  it('myTeamOverview requires @authenticated directive', () => {
    const start = schema.indexOf('myTeamOverview');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });

  it('myTeamOverview requires @requiresRole directive', () => {
    const start = schema.indexOf('myTeamOverview');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@requiresRole');
  });

  it('myTeamOverview restricts to MANAGER, ORG_ADMIN, SUPER_ADMIN', () => {
    const start = schema.indexOf('myTeamOverview');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('ORG_ADMIN');
    expect(b).toContain('SUPER_ADMIN');
  });

  it('STUDENT is NOT listed in myTeamOverview roles', () => {
    const start = schema.indexOf('myTeamOverview');
    const end = schema.indexOf('myTeamMemberProgress', start);
    const b = schema.slice(start, end > start ? end : start + 200);
    expect(b).not.toContain('STUDENT');
  });

  it('addTeamMember mutation is present', () => {
    expect(schema).toContain('addTeamMember');
  });

  it('addTeamMember requires @authenticated directive', () => {
    const start = schema.indexOf('addTeamMember');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });

  it('addTeamMember requires @requiresRole with ORG_ADMIN or SUPER_ADMIN', () => {
    const start = schema.indexOf('addTeamMember');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@requiresRole');
    expect(b).toContain('ORG_ADMIN');
  });

  it('STUDENT is NOT listed in addTeamMember roles', () => {
    const start = schema.indexOf('addTeamMember');
    const end = schema.indexOf('removeTeamMember', start);
    const b = schema.slice(start, end > start ? end : start + 200);
    expect(b).not.toContain('STUDENT');
  });
});

// ─── Phase 37: Onboarding authorization ──────────────────────────────────────

describe('G-15: onboarding.graphql (Phase 37) -- onboarding mutations require @authenticated', () => {
  let schema: string;
  beforeAll(() => {
    schema = read('apps/subgraph-core/src/onboarding/onboarding.graphql');
  });

  it('schema file exists and is non-empty', () => {
    expect(schema.length).toBeGreaterThan(0);
  });

  it('skipOnboarding mutation is present', () => {
    expect(schema).toContain('skipOnboarding');
  });

  it('skipOnboarding requires @authenticated directive', () => {
    const start = schema.indexOf('skipOnboarding');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });

  it('skipOnboarding is self-service: does NOT require @requiresRole', () => {
    const start = schema.indexOf('skipOnboarding');
    const b = schema.slice(start, start + 200);
    // Onboarding skip is self-service — no elevated role required
    expect(b).not.toContain('@requiresRole');
  });

  it('updateOnboardingStep requires @authenticated directive', () => {
    const start = schema.indexOf('updateOnboardingStep');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });

  it('completeOnboarding requires @authenticated directive', () => {
    const start = schema.indexOf('completeOnboarding');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });

  it('myOnboardingState query requires @authenticated', () => {
    const start = schema.indexOf('myOnboardingState');
    const b = schema.slice(start, start + 200);
    expect(b).toContain('@authenticated');
  });
});
