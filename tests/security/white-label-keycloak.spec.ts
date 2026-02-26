import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Resolve paths relative to this file so they work regardless of cwd
const ROOT = resolve(import.meta.dirname, '../..');

describe('Keycloak per-tenant isolation (G-20)', () => {
  describe('Provisioning script', () => {
    it('provisioning script exists', () => {
      expect(
        existsSync(resolve(ROOT, 'scripts/provision-tenant-realm.sh'))
      ).toBe(true);
    });

    it('script enables brute force protection on new realms (G-12 compliance for all tenants)', () => {
      const src = readFileSync(
        resolve(ROOT, 'scripts/provision-tenant-realm.sh'),
        'utf8'
      );
      expect(src).toContain('bruteForceProtected=true');
    });

    it('script requires SSL for all connections', () => {
      const src = readFileSync(
        resolve(ROOT, 'scripts/provision-tenant-realm.sh'),
        'utf8'
      );
      expect(src).toContain('sslRequired=all');
    });

    it('script adds hardcoded tenant_id claim to prevent cross-tenant token reuse', () => {
      const src = readFileSync(
        resolve(ROOT, 'scripts/provision-tenant-realm.sh'),
        'utf8'
      );
      expect(src).toContain('oidc-hardcoded-claim-mapper');
      expect(src).toContain('tenant_id');
      expect(src).toContain('TENANT_UUID');
    });

    it('script sets access token lifetime to 900 seconds (15 min)', () => {
      const src = readFileSync(
        resolve(ROOT, 'scripts/provision-tenant-realm.sh'),
        'utf8'
      );
      expect(src).toContain('accessTokenLifespan=900');
    });

    it('script uses failureFactor=5 for consistent brute-force config', () => {
      const src = readFileSync(
        resolve(ROOT, 'scripts/provision-tenant-realm.sh'),
        'utf8'
      );
      expect(src).toContain('failureFactor=5');
    });

    it('script creates all four EduSphere roles in the new realm', () => {
      const src = readFileSync(
        resolve(ROOT, 'scripts/provision-tenant-realm.sh'),
        'utf8'
      );
      expect(src).toContain('STUDENT');
      expect(src).toContain('INSTRUCTOR');
      expect(src).toContain('ORG_ADMIN');
      expect(src).toContain('SUPER_ADMIN');
    });

    it('script disables direct access grants (prevents password spraying via API)', () => {
      const src = readFileSync(
        resolve(ROOT, 'scripts/provision-tenant-realm.sh'),
        'utf8'
      );
      expect(src).toContain('directAccessGrantsEnabled=false');
    });
  });

  describe('Tenant domains schema (G-21)', () => {
    it('tenant_domains table exists', () => {
      expect(
        existsSync(resolve(ROOT, 'packages/db/src/schema/tenantDomains.ts'))
      ).toBe(true);
    });

    it('domain field has unique constraint (no two tenants share a domain)', () => {
      const src = readFileSync(
        resolve(ROOT, 'packages/db/src/schema/tenantDomains.ts'),
        'utf8'
      );
      expect(src).toContain('.unique()');
    });

    it('schema tracks keycloakRealm per domain for routing', () => {
      const src = readFileSync(
        resolve(ROOT, 'packages/db/src/schema/tenantDomains.ts'),
        'utf8'
      );
      expect(src).toContain('keycloakRealm');
    });

    it('schema supports domain verification workflow', () => {
      const src = readFileSync(
        resolve(ROOT, 'packages/db/src/schema/tenantDomains.ts'),
        'utf8'
      );
      expect(src).toContain('verificationToken');
      expect(src).toContain('verified');
    });

    it('domain schema exported from db schema index', () => {
      const src = readFileSync(
        resolve(ROOT, 'packages/db/src/schema/index.ts'),
        'utf8'
      );
      expect(src).toMatch(/tenantDomains/);
    });
  });

  describe('Tenant provisioning documentation', () => {
    it('provisioning guide exists', () => {
      expect(
        existsSync(resolve(ROOT, 'docs/deployment/TENANT_PROVISIONING.md'))
      ).toBe(true);
    });

    it('documents G-20 identity isolation model', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/TENANT_PROVISIONING.md'),
        'utf8'
      );
      expect(src).toContain('G-20');
    });

    it('documents G-21 data residency regions', () => {
      const src = readFileSync(
        resolve(ROOT, 'docs/deployment/TENANT_PROVISIONING.md'),
        'utf8'
      );
      expect(src).toContain('eu-central-1');
    });
  });
});
