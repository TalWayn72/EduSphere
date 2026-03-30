/**
 * Static security tests for G-04 Consent Management (GDPR Art.6+7).
 * These tests verify the presence and correctness of consent infrastructure
 * without requiring a running database or service layer.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');

function readFile(p: string): string {
  const full = resolve(ROOT, p);
  return existsSync(full) ? readFileSync(full, 'utf-8') : '';
}

describe('G-04: Consent Schema', () => {
  it('consent.ts schema file exists', () => {
    expect(existsSync(resolve(ROOT, 'packages/db/src/schema/consent.ts'))).toBe(
      true
    );
  });

  it('consent schema defines THIRD_PARTY_LLM type (AI data processing)', () => {
    const content = readFile('packages/db/src/schema/consent.ts');
    expect(content).toContain('THIRD_PARTY_LLM');
  });

  it('consent schema defines AI_PROCESSING type', () => {
    const content = readFile('packages/db/src/schema/consent.ts');
    expect(content).toContain('AI_PROCESSING');
  });

  it('consent schema has RLS enabled', () => {
    const content = readFile('packages/db/src/schema/consent.ts');
    expect(content).toContain('enableRLS');
  });

  it('consent RLS uses correct variable app.current_user_id (SI-1)', () => {
    const content = readFile('packages/db/src/schema/consent.ts');
    expect(content).toContain('app.current_user_id');
    expect(content).not.toMatch(/'app\.current_user'[^_]/);
  });

  it('consent schema exported from schema index', () => {
    const content = readFile('packages/db/src/schema/index.ts');
    expect(content).toMatch(/consent/i);
  });

  it('consent table has user_id + consent_type unique constraint', () => {
    const content = readFile('packages/db/src/schema/consent.ts');
    expect(content).toContain('unique');
    expect(content).toMatch(/userId.*consentType|consentType.*userId/s);
  });

  it('consent schema defines all 6 GDPR-relevant consent types', () => {
    const content = readFile('packages/db/src/schema/consent.ts');
    expect(content).toContain('ESSENTIAL');
    expect(content).toContain('ANALYTICS');
    expect(content).toContain('AI_PROCESSING');
    expect(content).toContain('THIRD_PARTY_LLM');
    expect(content).toContain('MARKETING');
    expect(content).toContain('RESEARCH');
  });

  it('consent schema records givenAt and withdrawnAt timestamps for Art.7 proof', () => {
    const content = readFile('packages/db/src/schema/consent.ts');
    expect(content).toContain('givenAt');
    expect(content).toContain('withdrawnAt');
  });

  it('consent schema records consentVersion for version tracking', () => {
    const content = readFile('packages/db/src/schema/consent.ts');
    expect(content).toContain('consentVersion');
  });
});

describe('G-04: Consent Service', () => {
  it('consent.service.ts exists', () => {
    expect(
      existsSync(
        resolve(ROOT, 'apps/subgraph-core/src/consent/consent.service.ts')
      )
    ).toBe(true);
  });

  it('ESSENTIAL consent never requires DB check (always true)', () => {
    const content = readFile(
      'apps/subgraph-core/src/consent/consent.service.ts'
    );
    expect(content).toContain('ESSENTIAL');
    expect(content).toContain('return true');
  });

  it('consent service writes audit log on change (GDPR Art.7)', () => {
    const content = readFile(
      'apps/subgraph-core/src/consent/consent.service.ts'
    );
    expect(content).toContain('CONSENT_GIVEN');
    expect(content).toContain('CONSENT_WITHDRAWN');
  });

  it('consent service uses upsert (not insert-only)', () => {
    const content = readFile(
      'apps/subgraph-core/src/consent/consent.service.ts'
    );
    expect(content).toContain('onConflictDoUpdate');
  });

  it('hasConsent supports THIRD_PARTY_LLM type (SI-10 AI gate)', () => {
    const content = readFile(
      'apps/subgraph-core/src/consent/consent.service.ts'
    );
    expect(content).toContain('THIRD_PARTY_LLM');
  });

  it('audit log includes gdprArticle 7 metadata', () => {
    const content = readFile(
      'apps/subgraph-core/src/consent/consent.service.ts'
    );
    expect(content).toContain('gdprArticle');
    expect(content).toContain("'7'");
  });

  it('consent service never exposes raw SQL (uses Drizzle ORM)', () => {
    const content = readFile(
      'apps/subgraph-core/src/consent/consent.service.ts'
    );
    expect(content).not.toMatch(/query\s*\(/);
    expect(content).not.toMatch(/raw\s*\(/);
  });
});

describe('G-04: Consent Service Tests', () => {
  it('consent.service.spec.ts exists', () => {
    expect(
      existsSync(
        resolve(ROOT, 'apps/subgraph-core/src/consent/consent.service.spec.ts')
      )
    ).toBe(true);
  });

  it('spec covers ESSENTIAL bypass path', () => {
    const content = readFile(
      'apps/subgraph-core/src/consent/consent.service.spec.ts'
    );
    expect(content).toContain('ESSENTIAL');
  });

  it('spec covers CONSENT_WITHDRAWN case', () => {
    const content = readFile(
      'apps/subgraph-core/src/consent/consent.service.spec.ts'
    );
    expect(content).toContain('CONSENT_WITHDRAWN');
  });

  it('spec covers CONSENT_GIVEN case', () => {
    const content = readFile(
      'apps/subgraph-core/src/consent/consent.service.spec.ts'
    );
    expect(content).toContain('CONSENT_GIVEN');
  });
});

describe('BUG-109 REGRESSION: Consent service must use withTenantContext for RLS', () => {
  const serviceContent = readFile(
    'apps/subgraph-core/src/consent/consent.service.ts'
  );

  it('consent.service.ts imports withTenantContext from @edusphere/db', () => {
    expect(serviceContent).toContain('withTenantContext');
    expect(serviceContent).toMatch(
      /import\s+\{[^}]*withTenantContext[^}]*\}\s+from\s+['"]@edusphere\/db['"]/
    );
  });

  it('updateConsent method wraps DB operations in withTenantContext', () => {
    // Extract updateConsent method body (from signature to next method or end)
    const updateMatch = serviceContent.match(
      /async updateConsent[\s\S]*?(?=async \w+|private async|^\}$)/m
    );
    expect(updateMatch).not.toBeNull();
    const updateBody = updateMatch![0];
    expect(updateBody).toContain('withTenantContext');
  });

  it('getUserConsents method wraps DB query in withTenantContext', () => {
    const getMatch = serviceContent.match(
      /async getUserConsents[\s\S]*?(?=async \w+|private async|^\}$)/m
    );
    expect(getMatch).not.toBeNull();
    const getBody = getMatch![0];
    expect(getBody).toContain('withTenantContext');
  });

  it('hasConsent method wraps non-ESSENTIAL DB query in withTenantContext', () => {
    const hasMatch = serviceContent.match(
      /async hasConsent[\s\S]*?(?=async \w+|private async|^\}$)/m
    );
    expect(hasMatch).not.toBeNull();
    const hasBody = hasMatch![0];
    expect(hasBody).toContain('withTenantContext');
  });

  it('no direct this.db.select() or this.db.insert() outside withTenantContext', () => {
    // All DB access should go through withTenantContext callback (tx),
    // not through this.db directly (except ESSENTIAL early return).
    // Count direct this.db usages that are NOT in withTenantContext call args.
    const lines = serviceContent.split('\n');
    const directDbLines = lines.filter(
      (line) =>
        (line.includes('this.db.select') ||
          line.includes('this.db.insert') ||
          line.includes('this.db.update') ||
          line.includes('this.db.delete')) &&
        !line.includes('withTenantContext')
    );
    expect(
      directDbLines,
      `Found direct DB access bypassing RLS:\n${directDbLines.join('\n')}`
    ).toHaveLength(0);
  });

  it('writeAuditLog uses tx (from withTenantContext) not this.db', () => {
    // The private writeAuditLog should use the transaction passed from
    // withTenantContext, not the raw this.db connection
    const auditMatch = serviceContent.match(
      /private async writeAuditLog[\s\S]*?(?=async \w+|private async|\n\}$)/m
    );
    if (auditMatch) {
      const auditBody = auditMatch[0];
      // If writeAuditLog still exists as a separate method, it should
      // either accept a tx parameter or be called within withTenantContext
      const usesDirectDb =
        auditBody.includes('this.db.insert') ||
        auditBody.includes('this.db.select');
      expect(
        usesDirectDb,
        'writeAuditLog uses this.db directly — must use tx from withTenantContext'
      ).toBe(false);
    }
  });
});

describe('BUG-092: Consent module included in subgraph-core build', () => {
  it('consent.resolver.ts is imported by app.module.ts', () => {
    const content = readFile('apps/subgraph-core/src/app.module.ts');
    expect(content).toContain('ConsentModule');
    expect(content).toContain("'./consent/consent.module'");
  });

  it('consent.module.ts exists and exports ConsentModule', () => {
    const content = readFile(
      'apps/subgraph-core/src/consent/consent.module.ts'
    );
    expect(content).toContain('ConsentModule');
    expect(content).toContain('ConsentResolver');
    expect(content).toContain('ConsentService');
  });

  it('Dockerfile clears subgraph dist/ dirs before build to prevent stale cache', () => {
    const dockerfile = readFile('Dockerfile');
    expect(dockerfile).toContain('apps/subgraph-core/dist');
    expect(dockerfile).toContain('apps/subgraph-content/dist');
    expect(dockerfile).toContain('apps/subgraph-agent/dist');
  });

  it('consent.graphql SDL is included in nest-cli.json assets', () => {
    const nestCli = readFile('apps/subgraph-core/nest-cli.json');
    expect(nestCli).toContain('*.graphql');
  });

  it('BUG-092R2: subgraph-agent @ai-sdk/openai version is compatible with ai SDK v5 (spec v2)', () => {
    const pkg = readFile('apps/subgraph-agent/package.json');
    const parsed = JSON.parse(pkg);
    const openaiVersion = parsed.dependencies['@ai-sdk/openai'];
    // Must be ~2.x (spec v2) — NOT ^3.x (spec v3, incompatible with ai@5.0.x)
    expect(openaiVersion).toMatch(/^[~^]?2\./);
    // ai SDK must be v5.x
    const aiVersion = parsed.dependencies['ai'];
    expect(aiVersion).toMatch(/\^5\./);
  });
});
