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
    expect(existsSync(resolve(ROOT, 'packages/db/src/schema/consent.ts'))).toBe(true);
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
      existsSync(resolve(ROOT, 'apps/subgraph-core/src/consent/consent.service.ts')),
    ).toBe(true);
  });

  it('ESSENTIAL consent never requires DB check (always true)', () => {
    const content = readFile('apps/subgraph-core/src/consent/consent.service.ts');
    expect(content).toContain('ESSENTIAL');
    expect(content).toContain('return true');
  });

  it('consent service writes audit log on change (GDPR Art.7)', () => {
    const content = readFile('apps/subgraph-core/src/consent/consent.service.ts');
    expect(content).toContain('CONSENT_GIVEN');
    expect(content).toContain('CONSENT_WITHDRAWN');
  });

  it('consent service uses upsert (not insert-only)', () => {
    const content = readFile('apps/subgraph-core/src/consent/consent.service.ts');
    expect(content).toContain('onConflictDoUpdate');
  });

  it('hasConsent supports THIRD_PARTY_LLM type (SI-10 AI gate)', () => {
    const content = readFile('apps/subgraph-core/src/consent/consent.service.ts');
    expect(content).toContain('THIRD_PARTY_LLM');
  });

  it('audit log includes gdprArticle 7 metadata', () => {
    const content = readFile('apps/subgraph-core/src/consent/consent.service.ts');
    expect(content).toContain('gdprArticle');
    expect(content).toContain("'7'");
  });

  it('consent service never exposes raw SQL (uses Drizzle ORM)', () => {
    const content = readFile('apps/subgraph-core/src/consent/consent.service.ts');
    expect(content).not.toMatch(/query\s*\(/);
    expect(content).not.toMatch(/raw\s*\(/);
  });
});

describe('G-04: Consent Service Tests', () => {
  it('consent.service.spec.ts exists', () => {
    expect(
      existsSync(resolve(ROOT, 'apps/subgraph-core/src/consent/consent.service.spec.ts')),
    ).toBe(true);
  });

  it('spec covers ESSENTIAL bypass path', () => {
    const content = readFile('apps/subgraph-core/src/consent/consent.service.spec.ts');
    expect(content).toContain('ESSENTIAL');
  });

  it('spec covers CONSENT_WITHDRAWN case', () => {
    const content = readFile('apps/subgraph-core/src/consent/consent.service.spec.ts');
    expect(content).toContain('CONSENT_WITHDRAWN');
  });

  it('spec covers CONSENT_GIVEN case', () => {
    const content = readFile('apps/subgraph-core/src/consent/consent.service.spec.ts');
    expect(content).toContain('CONSENT_GIVEN');
  });
});
