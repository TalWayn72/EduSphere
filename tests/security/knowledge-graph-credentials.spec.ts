/**
 * Static security tests for Phase 47 — Knowledge Graph Credentials.
 *
 * All checks are file-system / readFileSync — no running server needed.
 * Covers:
 *  - Graph-grounded credentials coverage gate (≥0.7 before issuing)
 *  - IDOR: userId sourced from JWT context, not client-supplied arg
 *  - Memory safety: OnModuleDestroy + closeAllPools on all new services
 *  - SI-1 compliance (app.current_user_id — not app.current_user)
 *  - RLS: knowledge_path_credentials has pgPolicy + enableRLS
 *  - RLS: chavruta_partner_sessions has pgPolicy + enableRLS
 *  - Chavruta self-match prevention (ne guard)
 *  - Cohort insights tenant isolation via withTenantContext
 *  - File existence gates for all Phase 47 deliverables
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const read = (p: string): string => {
  const full = resolve(ROOT, p);
  return existsSync(full) ? readFileSync(full, 'utf-8') : '';
};

const exists = (p: string): boolean => existsSync(resolve(ROOT, p));

// ── Graph-Grounded Credentials coverage gate ──────────────────────────────────

describe('Phase 47 Security — Graph-grounded credentials coverage gate', () => {
  it('verifyKnowledgePathCoverage returns covered=true only when coverageScore >= masteryThreshold', () => {
    const src = read(
      'apps/subgraph-content/src/certificate/graph-credential.service.ts',
    );
    // The coverage check: coverageScore >= masteryThreshold (default 0.7)
    expect(src).toMatch(/coverageScore\s*>=\s*masteryThreshold/);
  });

  it('issueGraphGroundedBadge throws BadRequestException when coverage is insufficient', () => {
    const src = read(
      'apps/subgraph-content/src/open-badges/open-badge.service.ts',
    );
    expect(src).toMatch(/BadRequestException/);
    expect(src).toMatch(/coverage.*insufficient|insufficient.*coverage/i);
  });

  it('coverage gate enforces 70% threshold in error message', () => {
    const src = read(
      'apps/subgraph-content/src/open-badges/open-badge.service.ts',
    );
    // Error message must reference the 70% requirement
    expect(src).toMatch(/70%|>=70|>=\s*0\.7|required.*70|0\.70/);
  });

  it('masteryThreshold defaults to 0.7 in recordGraphCredential', () => {
    const src = read(
      'apps/subgraph-content/src/certificate/graph-credential.service.ts',
    );
    expect(src).toMatch(/masteryThreshold.*0\.7|0\.7.*masteryThreshold/);
  });
});

// ── IDOR: userId comes from JWT context, not client-supplied arg ──────────────

describe('Phase 47 Security — IDOR: issueGraphGroundedBadge userId from JWT', () => {
  it('issueGraphGroundedBadge mutation uses user.userId from authContext (not client arg)', () => {
    const resolver = read(
      'apps/subgraph-content/src/open-badges/open-badge.resolver.ts',
    );
    // The mutation must extract userId from auth context, not from @Args
    expect(resolver).toMatch(/user\.userId/);
    // The issueGraphGroundedBadge mutation must NOT accept a userId @Args parameter
    const mutationBlock = resolver.match(
      /issueGraphGroundedBadge[\s\S]*?(?=\n\s*@(?:Query|Mutation)|$)/,
    )?.[0] ?? '';
    // userId should NOT appear as an @Args parameter in this mutation
    expect(mutationBlock).not.toMatch(/@Args\('userId'\)/);
  });

  it('knowledgePathCoverage query uses user.userId from authContext', () => {
    const resolver = read(
      'apps/subgraph-content/src/open-badges/open-badge.resolver.ts',
    );
    expect(resolver).toMatch(/requireAuth\(ctx\)/);
    expect(resolver).toMatch(/user\.userId.*user\.tenantId|user\.tenantId.*user\.userId/s);
  });

  it('resolver requireAuth throws UnauthorizedException when no authContext', () => {
    const resolver = read(
      'apps/subgraph-content/src/open-badges/open-badge.resolver.ts',
    );
    expect(resolver).toMatch(/UnauthorizedException/);
    expect(resolver).toMatch(/Authentication required/i);
  });
});

// ── Memory safety: GraphGroundedCredentialService OnModuleDestroy ─────────────

describe('Phase 47 Security — Memory safety: GraphGroundedCredentialService', () => {
  it('GraphGroundedCredentialService implements OnModuleDestroy', () => {
    const src = read(
      'apps/subgraph-content/src/certificate/graph-credential.service.ts',
    );
    expect(src).toMatch(/OnModuleDestroy/);
    expect(src).toMatch(/onModuleDestroy/);
  });

  it('GraphGroundedCredentialService calls closeAllPools in onModuleDestroy', () => {
    const src = read(
      'apps/subgraph-content/src/certificate/graph-credential.service.ts',
    );
    expect(src).toMatch(/closeAllPools/);
  });

  it('GraphGroundedCredentialService uses createDatabaseConnection (not new Pool)', () => {
    const src = read(
      'apps/subgraph-content/src/certificate/graph-credential.service.ts',
    );
    expect(src).toMatch(/createDatabaseConnection/);
    expect(src).not.toMatch(/new Pool\(\)/);
  });
});

// ── SI-1 compliance: knowledge-credentials schema ────────────────────────────

describe('Phase 47 Security — SI-1: app.current_user_id in knowledge-credentials schema', () => {
  it('knowledge-credentials schema uses app.current_user_id (not app.current_user)', () => {
    const schema = read('packages/db/src/schema/knowledge-credentials.ts');
    expect(schema).toMatch(/app\.current_user_id/);
    expect(schema).not.toMatch(/current_setting\('app\.current_user',/);
  });

  it('SI-1 compliant in both policy blocks (participant_access and owner)', () => {
    const schema = read('packages/db/src/schema/knowledge-credentials.ts');
    // Count occurrences — must appear at least twice (once per table RLS policy)
    const matches = schema.match(/app\.current_user_id/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ── RLS: knowledge_path_credentials ──────────────────────────────────────────

describe('Phase 47 Security — RLS: knowledge_path_credentials', () => {
  it('knowledge_path_credentials has pgPolicy with tenant isolation', () => {
    const schema = read('packages/db/src/schema/knowledge-credentials.ts');
    expect(schema).toMatch(/knowledge_path_credentials_tenant/);
    expect(schema).toMatch(/app\.current_tenant/);
  });

  it('knowledge_path_credentials owner policy restricts to user_id or elevated role', () => {
    const schema = read('packages/db/src/schema/knowledge-credentials.ts');
    expect(schema).toMatch(/knowledge_path_credentials_owner/);
    expect(schema).toMatch(/user_id.*current_setting.*app\.current_user_id/s);
  });

  it('knowledge_path_credentials uses enableRLS()', () => {
    const schema = read('packages/db/src/schema/knowledge-credentials.ts');
    // Find the knowledgePathCredentials table definition section
    expect(schema).toMatch(/knowledgePathCredentials[\s\S]*?enableRLS\(\)/);
  });
});

// ── RLS: chavruta_partner_sessions ────────────────────────────────────────────

describe('Phase 47 Security — RLS: chavruta_partner_sessions', () => {
  it('chavruta_partner_sessions has pgPolicy with tenant isolation', () => {
    const schema = read('packages/db/src/schema/knowledge-credentials.ts');
    expect(schema).toMatch(/chavruta_partner_sessions_tenant_isolation/);
    expect(schema).toMatch(/app\.current_tenant/);
  });

  it('chavruta_partner_sessions participant_access policy covers both initiator and partner', () => {
    const schema = read('packages/db/src/schema/knowledge-credentials.ts');
    expect(schema).toMatch(/chavruta_partner_sessions_participant_access/);
    expect(schema).toMatch(/initiator_id.*current_setting.*app\.current_user_id/s);
    expect(schema).toMatch(/partner_id.*current_setting.*app\.current_user_id/s);
  });

  it('chavruta_partner_sessions uses enableRLS()', () => {
    const schema = read('packages/db/src/schema/knowledge-credentials.ts');
    // Find the chavrutaPartnerSessions table definition section
    expect(schema).toMatch(/chavrutaPartnerSessions[\s\S]*?enableRLS\(\)/);
  });

  it('chavruta_partner_sessions has withCheck on tenant policy', () => {
    const schema = read('packages/db/src/schema/knowledge-credentials.ts');
    expect(schema).toMatch(/withCheck.*app\.current_tenant/s);
  });
});

// ── Chavruta self-match prevention ────────────────────────────────────────────

describe('Phase 47 Security — Chavruta self-match prevention', () => {
  it('findPartnerForDebate excludes the requesting user via ne() guard', () => {
    const src = read(
      'apps/subgraph-agent/src/chavruta-partner/chavruta-partner.service.ts',
    );
    // Uses Drizzle ne() to exclude the initiator from candidates
    expect(src).toMatch(/ne\s*\(.*userId|ne\s*\(.*userCourses\.userId/);
  });

  it('chavruta-partner service imports ne from @edusphere/db', () => {
    const src = read(
      'apps/subgraph-agent/src/chavruta-partner/chavruta-partner.service.ts',
    );
    expect(src).toMatch(/import.*\bne\b.*@edusphere\/db/s);
  });

  it('createPartnerSession does not allow initiator === partner (ne guard in candidate query)', () => {
    const src = read(
      'apps/subgraph-agent/src/chavruta-partner/chavruta-partner.service.ts',
    );
    // The ne(userCourses.userId, userId) prevents self-matching at query level
    expect(src).toMatch(/ne\([^)]*userId[^)]*\)/);
  });
});

// ── Chavruta OnModuleDestroy + closeAllPools ──────────────────────────────────

describe('Phase 47 Security — Memory safety: ChavrutaPartnerMatchService', () => {
  it('ChavrutaPartnerMatchService implements OnModuleDestroy', () => {
    const src = read(
      'apps/subgraph-agent/src/chavruta-partner/chavruta-partner.service.ts',
    );
    expect(src).toMatch(/OnModuleDestroy/);
    expect(src).toMatch(/onModuleDestroy/);
  });

  it('ChavrutaPartnerMatchService calls closeAllPools in onModuleDestroy', () => {
    const src = read(
      'apps/subgraph-agent/src/chavruta-partner/chavruta-partner.service.ts',
    );
    expect(src).toMatch(/closeAllPools/);
  });

  it('ChavrutaPartnerMatchService uses withTenantContext for all DB operations', () => {
    const src = read(
      'apps/subgraph-agent/src/chavruta-partner/chavruta-partner.service.ts',
    );
    expect(src).toMatch(/withTenantContext/);
  });
});

// ── Cohort insights RLS via tenant isolation ──────────────────────────────────

describe('Phase 47 Security — Cohort insights: tenant isolation via withTenantContext', () => {
  it('CohortInsightsService wraps all DB queries in withTenantContext', () => {
    const src = read(
      'apps/subgraph-knowledge/src/cohort-insights/cohort-insights.service.ts',
    );
    expect(src).toMatch(/withTenantContext/);
  });

  it('CohortInsightsService passes tenantId and userId to TenantContext', () => {
    const src = read(
      'apps/subgraph-knowledge/src/cohort-insights/cohort-insights.service.ts',
    );
    expect(src).toMatch(/tenantId.*userId.*userRole|TenantContext.*tenantId/s);
  });

  it('CohortInsightsService implements OnModuleDestroy with closeAllPools', () => {
    const src = read(
      'apps/subgraph-knowledge/src/cohort-insights/cohort-insights.service.ts',
    );
    expect(src).toMatch(/OnModuleDestroy/);
    expect(src).toMatch(/closeAllPools/);
  });

  it('CohortInsightsService raw SQL uses parameterized tenantId (no string concat injection)', () => {
    const src = read(
      'apps/subgraph-knowledge/src/cohort-insights/cohort-insights.service.ts',
    );
    // Uses sql template tag with ${tenantId} interpolation (Drizzle parameterizes this)
    expect(src).toMatch(/sql`[\s\S]*?\$\{tenantId\}/);
  });
});

// ── File existence gates ──────────────────────────────────────────────────────

describe('Phase 47 Security — Required files exist', () => {
  it('migration 0029_knowledge_graph_credentials.sql exists', () => {
    expect(
      exists('packages/db/src/migrations/0029_knowledge_graph_credentials.sql'),
    ).toBe(true);
  });

  it('graph-credential.service.ts exists', () => {
    expect(
      exists('apps/subgraph-content/src/certificate/graph-credential.service.ts'),
    ).toBe(true);
  });

  it('chavruta-partner.service.ts exists', () => {
    expect(
      exists(
        'apps/subgraph-agent/src/chavruta-partner/chavruta-partner.service.ts',
      ),
    ).toBe(true);
  });

  it('cohort-insights.service.ts exists', () => {
    expect(
      exists(
        'apps/subgraph-knowledge/src/cohort-insights/cohort-insights.service.ts',
      ),
    ).toBe(true);
  });

  it('knowledge-credentials.ts schema exists', () => {
    expect(
      exists('packages/db/src/schema/knowledge-credentials.ts'),
    ).toBe(true);
  });

  it('open-badge.resolver.ts exists (hosts issueGraphGroundedBadge)', () => {
    expect(
      exists('apps/subgraph-content/src/open-badges/open-badge.resolver.ts'),
    ).toBe(true);
  });
});
