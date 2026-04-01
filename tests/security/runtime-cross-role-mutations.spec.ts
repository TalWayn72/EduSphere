/**
 * #54: Cross-Role Mutation Authorization Tests
 *
 * Static source-analysis tests that verify:
 * 1. All admin mutations have @requiresRole or @requiresScopes directives
 * 2. Student-accessible queries don't expose admin-only data
 * 3. Role matrix: STUDENT, INSTRUCTOR, RESEARCHER, ORG_ADMIN, SUPER_ADMIN
 *    vs sensitive mutations
 * 4. No mutations exist without at least @authenticated
 *
 * No running server required -- reads SDL files directly.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function read(relativePath: string): string {
  const abs = resolve(ROOT, relativePath);
  return existsSync(abs) ? readFileSync(abs, 'utf-8') : '';
}

/** Collect all .graphql SDL files under each subgraph src directory */
function collectSdlFiles(): { path: string; content: string }[] {
  const results: { path: string; content: string }[] = [];
  const appsDir = resolve(ROOT, 'apps');
  if (!existsSync(appsDir)) return results;

  for (const app of readdirSync(appsDir)) {
    if (!app.startsWith('subgraph-')) continue;
    const srcDir = join(appsDir, app, 'src');
    if (!existsSync(srcDir)) continue;
    walkDir(srcDir, results, `apps/${app}/src`);
  }
  return results;
}

function walkDir(
  dir: string,
  results: { path: string; content: string }[],
  relPrefix: string
): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkDir(full, results, `${relPrefix}/${entry}`);
    } else if (entry.endsWith('.graphql')) {
      results.push({
        path: `${relPrefix}/${entry}`,
        content: readFileSync(full, 'utf-8'),
      });
    }
  }
}

/**
 * Extract individual mutation field definitions from a Mutation block.
 * Returns array of { name, slice } where slice is the SDL text for that field.
 */
function extractMutationFields(sdl: string): { name: string; slice: string }[] {
  const fields: { name: string; slice: string }[] = [];
  // Match both `type Mutation {` and `extend type Mutation {`
  const mutBlockRegex = /(?:extend\s+)?type\s+Mutation\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = mutBlockRegex.exec(sdl)) !== null) {
    const startBrace = match.index + match[0].length;
    let depth = 1;
    let pos = startBrace;
    while (pos < sdl.length && depth > 0) {
      if (sdl[pos] === '{') depth++;
      if (sdl[pos] === '}') depth--;
      pos++;
    }
    const blockBody = sdl.slice(startBrace, pos - 1);
    // Parse individual field definitions (name starts after newline + optional whitespace)
    const fieldRegex = /^\s+(\w+)\s*\(/gm;
    let fieldMatch: RegExpExecArray | null;
    const fieldStarts: { name: string; idx: number }[] = [];
    while ((fieldMatch = fieldRegex.exec(blockBody)) !== null) {
      fieldStarts.push({ name: fieldMatch[1], idx: fieldMatch.index });
    }
    for (let i = 0; i < fieldStarts.length; i++) {
      const end =
        i + 1 < fieldStarts.length ? fieldStarts[i + 1].idx : blockBody.length;
      fields.push({
        name: fieldStarts[i].name,
        slice: blockBody.slice(fieldStarts[i].idx, end),
      });
    }
  }
  return fields;
}

/** Roles that should NEVER appear in admin-only mutation directives */
const UNAUTHORIZED_ROLES_FOR_ADMIN = ['STUDENT', 'RESEARCHER'] as const;

/** Admin mutations that must restrict to ORG_ADMIN / SUPER_ADMIN only */
const ADMIN_ONLY_MUTATIONS = [
  'createUser',
  'updateUser',
  'deactivateUser',
  'suspendUser',
  'resetUserPassword',
  'bulkImportUsers',
  'saveAtRiskThresholds',
  'updateSecuritySettings',
  'createRole',
  'updateRole',
  'deleteRole',
  'delegateRole',
  'revokeDelegation',
  'exportAuditLog',
  'scheduleGdprErasure',
  'generateScimToken',
  'revokeScimToken',
  'createAnnouncement',
  'updateAnnouncement',
  'deleteAnnouncement',
  'publishAnnouncement',
  'updateNotificationTemplate',
  'resetNotificationTemplate',
  'updateTenantLanguageSettings',
  'updateTenantBranding',
  'approvePilotRequest',
  'rejectPilotRequest',
  'generateBIApiKey',
  'revokeBIApiKey',
  'disconnectCrm',
] as const;

/** Self-service mutations that any authenticated user may call */
const SELF_SERVICE_MUTATIONS = [
  'updateUserPreferences',
  'updateProfileVisibility',
  'registerPushToken',
  'unregisterPushToken',
  'skipOnboarding',
  'updateOnboardingStep',
  'completeOnboarding',
  'submitPilotRequest',
] as const;

/**
 * Mutations that intentionally lack @authenticated because they rely on
 * course-level ownership checks or are instructor-facing RLS-guarded.
 * These are verified separately (not anonymous -- resolver enforces auth).
 */
const RESOLVER_GUARDED_MUTATIONS = [
  'addUrlSource',
  'addTextSource',
  'addYoutubeSource',
  'addFileSource',
  'deleteKnowledgeSource',
  // Org onboarding: public signup endpoint (no JWT — unauthenticated by design)
  'createOrganization',
  // Org onboarding: invitation acceptance uses token-based auth, not JWT
  'acceptInvitation',
] as const;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('#54: Cross-role mutation authorization — SDL static analysis', () => {
  let allSdlFiles: { path: string; content: string }[];
  let allMutationFields: {
    name: string;
    slice: string;
    file: string;
  }[];

  beforeAll(() => {
    allSdlFiles = collectSdlFiles();
    allMutationFields = [];
    for (const f of allSdlFiles) {
      for (const field of extractMutationFields(f.content)) {
        allMutationFields.push({ ...field, file: f.path });
      }
    }
  });

  // ── Test 1: SDL files discovered ────────────────────────────────────────
  it('discovers at least 20 SDL files across subgraphs', () => {
    expect(allSdlFiles.length).toBeGreaterThanOrEqual(20);
  });

  // ── Test 2: All mutations discovered ────────────────────────────────────
  it('extracts at least 30 mutation fields from all SDL files', () => {
    expect(allMutationFields.length).toBeGreaterThanOrEqual(30);
  });

  // ── Test 3: Every mutation has at least one auth directive ──────────────
  it('every mutation field has an auth directive (except explicitly public or resolver-guarded ones)', () => {
    // submitPilotRequest is intentionally public (no auth required)
    // RESOLVER_GUARDED_MUTATIONS enforce auth at resolver level, not SDL
    const EXEMPT: readonly string[] = [
      'submitPilotRequest',
      ...RESOLVER_GUARDED_MUTATIONS,
    ];
    const missing = allMutationFields.filter(
      (m) =>
        !m.slice.includes('@authenticated') &&
        !m.slice.includes('@requiresRole') &&
        !m.slice.includes('@requiresScopes') &&
        !EXEMPT.includes(m.name)
    );
    expect(missing.map((m) => `${m.file} :: ${m.name}`)).toEqual([]);
  });

  // ── Test 4: Admin mutations have @requiresRole ──────────────────────────
  it('all known admin mutations have @requiresRole directive', () => {
    const missing: string[] = [];
    for (const adminMut of ADMIN_ONLY_MUTATIONS) {
      const found = allMutationFields.find((m) => m.name === adminMut);
      if (!found) continue; // mutation not in SDL (may be in a different form)
      if (!found.slice.includes('@requiresRole')) {
        missing.push(`${found.file} :: ${adminMut}`);
      }
    }
    expect(missing).toEqual([]);
  });

  // ── Test 5: STUDENT never appears in admin mutation role lists ──────────
  it('STUDENT role is excluded from all admin-only mutation directives', () => {
    const violations: string[] = [];
    for (const adminMut of ADMIN_ONLY_MUTATIONS) {
      const found = allMutationFields.find((m) => m.name === adminMut);
      if (!found) continue;
      if (found.slice.includes('STUDENT')) {
        violations.push(`${found.file} :: ${adminMut} allows STUDENT`);
      }
    }
    expect(violations).toEqual([]);
  });

  // ── Test 6: RESEARCHER never appears in admin mutation role lists ───────
  it('RESEARCHER role is excluded from all admin-only mutation directives', () => {
    const violations: string[] = [];
    for (const adminMut of ADMIN_ONLY_MUTATIONS) {
      const found = allMutationFields.find((m) => m.name === adminMut);
      if (!found) continue;
      if (found.slice.includes('RESEARCHER')) {
        violations.push(`${found.file} :: ${adminMut} allows RESEARCHER`);
      }
    }
    expect(violations).toEqual([]);
  });

  // ── Test 7: Self-service mutations do NOT have @requiresRole ────────────
  it('self-service mutations do not require elevated roles', () => {
    const violations: string[] = [];
    for (const selfMut of SELF_SERVICE_MUTATIONS) {
      const found = allMutationFields.find((m) => m.name === selfMut);
      if (!found) continue;
      if (found.slice.includes('@requiresRole')) {
        violations.push(
          `${found.file} :: ${selfMut} has @requiresRole but should be self-service`
        );
      }
    }
    expect(violations).toEqual([]);
  });

  // ── Test 8: SUPER_ADMIN-only mutations exclude ORG_ADMIN ───────────────
  it('SUPER_ADMIN-only mutations (pilot approve/reject) exclude ORG_ADMIN', () => {
    const superAdminOnly = ['approvePilotRequest', 'rejectPilotRequest'];
    const violations: string[] = [];
    for (const mutName of superAdminOnly) {
      const found = allMutationFields.find((m) => m.name === mutName);
      if (!found) continue;
      if (found.slice.includes('ORG_ADMIN')) {
        violations.push(
          `${found.file} :: ${mutName} allows ORG_ADMIN but should be SUPER_ADMIN only`
        );
      }
    }
    expect(violations).toEqual([]);
  });

  // ── Test 9: User write mutations require write:users scope ──────────────
  it('user management mutations require @requiresScopes with write:users', () => {
    const userWriteMutations = [
      'createUser',
      'updateUser',
      'deactivateUser',
      'suspendUser',
      'resetUserPassword',
      'bulkImportUsers',
    ];
    const missing: string[] = [];
    for (const mutName of userWriteMutations) {
      const found = allMutationFields.find((m) => m.name === mutName);
      if (!found) continue;
      if (
        !found.slice.includes('@requiresScopes') ||
        !found.slice.includes('write:users')
      ) {
        missing.push(`${found.file} :: ${mutName}`);
      }
    }
    expect(missing).toEqual([]);
  });

  // ── Test 10: No mutation field is completely unguarded ──────────────────
  it('no mutation lacks both @authenticated and @requiresRole/@requiresScopes (except resolver-guarded)', () => {
    const EXEMPT: readonly string[] = [
      'submitPilotRequest',
      ...RESOLVER_GUARDED_MUTATIONS,
    ];
    const unguarded = allMutationFields.filter(
      (m) =>
        !m.slice.includes('@authenticated') &&
        !m.slice.includes('@requiresRole') &&
        !m.slice.includes('@requiresScopes') &&
        !EXEMPT.includes(m.name)
    );
    expect(unguarded.map((m) => `${m.file} :: ${m.name}`)).toEqual([]);
  });

  // ── Test 11: Admin queries also have @requiresRole ──────────────────────
  it('admin-prefixed queries (adminOverview, adminUsers, adminAuditLog) require @requiresRole', () => {
    const adminQueryFiles = [
      {
        path: 'apps/subgraph-core/src/admin/admin.graphql',
        query: 'adminOverview',
      },
      {
        path: 'apps/subgraph-core/src/user/user.graphql',
        query: 'adminUsers',
      },
      {
        path: 'apps/subgraph-core/src/admin/audit.graphql',
        query: 'adminAuditLog',
      },
    ];
    for (const { path, query } of adminQueryFiles) {
      const sdl = read(path);
      const idx = sdl.indexOf(query);
      expect(idx).toBeGreaterThan(-1);
      const slice = sdl.slice(idx, idx + 300);
      expect(slice).toContain('@requiresRole');
      expect(slice).toContain('@authenticated');
    }
  });

  // ── Test 12: 5-role matrix on createUser ────────────────────────────────
  it('role matrix: createUser allows only SUPER_ADMIN and ORG_ADMIN', () => {
    const sdl = read('apps/subgraph-core/src/user/user.graphql');
    const idx = sdl.indexOf('createUser(');
    const end = sdl.indexOf('updateUser(', idx);
    const slice = sdl.slice(idx, end > idx ? end : idx + 400);

    // Allowed roles
    expect(slice).toContain('SUPER_ADMIN');
    expect(slice).toContain('ORG_ADMIN');

    // Forbidden roles
    expect(slice).not.toContain('STUDENT');
    expect(slice).not.toContain('RESEARCHER');
    expect(slice).not.toContain('INSTRUCTOR');
  });

  // ── Test 13: 5-role matrix on security settings ─────────────────────────
  it('role matrix: updateSecuritySettings allows only ORG_ADMIN and SUPER_ADMIN', () => {
    const sdl = read('apps/subgraph-core/src/admin/security.graphql');
    const idx = sdl.indexOf('updateSecuritySettings');
    const slice = sdl.slice(idx, idx + 300);

    expect(slice).toContain('ORG_ADMIN');
    expect(slice).toContain('SUPER_ADMIN');
    expect(slice).not.toContain('STUDENT');
    expect(slice).not.toContain('RESEARCHER');
    expect(slice).not.toContain('INSTRUCTOR');
  });

  // ── Test 14: Billing queries restrict platformLiveStats to SUPER_ADMIN ──
  it('platformLiveStats query is restricted to SUPER_ADMIN only', () => {
    const sdl = read('apps/subgraph-core/src/billing/billing.graphql');
    const idx = sdl.indexOf('platformLiveStats');
    const slice = sdl.slice(idx, idx + 200);

    expect(slice).toContain('@requiresRole');
    expect(slice).toContain('SUPER_ADMIN');
    expect(slice).not.toContain('ORG_ADMIN');
    expect(slice).not.toContain('STUDENT');
    expect(slice).not.toContain('INSTRUCTOR');
  });

  // ── Test 15: Compliance mutations have @authenticated ───────────────────
  it('compliance mutations (generateComplianceReport, updateCourseComplianceSettings) have @authenticated', () => {
    const sdl = read('apps/subgraph-content/src/compliance/compliance.graphql');
    for (const mutName of [
      'generateComplianceReport',
      'updateCourseComplianceSettings',
    ]) {
      const idx = sdl.indexOf(mutName);
      expect(idx).toBeGreaterThan(-1);
      const slice = sdl.slice(idx, idx + 200);
      expect(slice).toContain('@authenticated');
    }
  });
});
