import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Navigate from tests/security → project root (two levels up)
const ROOT = resolve(join(import.meta.dirname, '../..'));

describe('White-label branding isolation (G-19)', () => {
  describe('TenantBrandingService', () => {
    it('branding service file exists', () => {
      const exists = (() => {
        try {
          readFileSync(
            resolve(
              ROOT,
              'apps/subgraph-core/src/tenant/tenant-branding.service.ts'
            )
          );
          return true;
        } catch {
          return false;
        }
      })();
      expect(exists).toBe(true);
    });

    it('service uses per-tenant lookup with tenantId filter', () => {
      const src = readFileSync(
        resolve(
          ROOT,
          'apps/subgraph-core/src/tenant/tenant-branding.service.ts'
        ),
        'utf8'
      );
      expect(src).toContain('eq(tenantBranding.tenantId, tenantId)');
    });

    it('service has TTL cache to avoid DB round-trips on every request', () => {
      const src = readFileSync(
        resolve(
          ROOT,
          'apps/subgraph-core/src/tenant/tenant-branding.service.ts'
        ),
        'utf8'
      );
      expect(src).toContain('CACHE_TTL_MS');
      expect(src).toContain('expiresAt');
    });

    it('service invalidates cache on update to prevent stale data', () => {
      const src = readFileSync(
        resolve(
          ROOT,
          'apps/subgraph-core/src/tenant/tenant-branding.service.ts'
        ),
        'utf8'
      );
      expect(src).toContain('cache.delete(tenantId)');
    });

    it('service has default branding fallback when no tenant record exists', () => {
      const src = readFileSync(
        resolve(
          ROOT,
          'apps/subgraph-core/src/tenant/tenant-branding.service.ts'
        ),
        'utf8'
      );
      expect(src).toContain('DEFAULT_BRANDING');
    });
  });

  describe('Frontend branding helper', () => {
    it('branding helper file exists', () => {
      const exists = (() => {
        try {
          readFileSync(resolve(ROOT, 'apps/web/src/lib/branding.ts'));
          return true;
        } catch {
          return false;
        }
      })();
      expect(exists).toBe(true);
    });

    it('applies primary color as CSS custom property', () => {
      const src = readFileSync(
        resolve(ROOT, 'apps/web/src/lib/branding.ts'),
        'utf8'
      );
      expect(src).toContain('--primary');
      expect(src).toContain('primaryColor');
    });

    it('updates document title with organization name (prevents hardcoded EduSphere)', () => {
      const src = readFileSync(
        resolve(ROOT, 'apps/web/src/lib/branding.ts'),
        'utf8'
      );
      expect(src).toContain('document.title');
      expect(src).toContain('organizationName');
    });

    it('updates favicon per tenant', () => {
      const src = readFileSync(
        resolve(ROOT, 'apps/web/src/lib/branding.ts'),
        'utf8'
      );
      expect(src).toContain('favicon');
      expect(src).toContain('faviconUrl');
    });

    it('hexToHsl converts hex color to HSL format for CSS', () => {
      const src = readFileSync(
        resolve(ROOT, 'apps/web/src/lib/branding.ts'),
        'utf8'
      );
      expect(src).toContain('hexToHsl');
      expect(src).toContain('parseInt(hex');
    });

    it('supports custom fonts per tenant', () => {
      const src = readFileSync(
        resolve(ROOT, 'apps/web/src/lib/branding.ts'),
        'utf8'
      );
      expect(src).toContain('fontFamily');
      expect(src).toContain('--font-sans');
    });

    it('detects tenant from subdomain for multi-tenant routing', () => {
      const src = readFileSync(
        resolve(ROOT, 'apps/web/src/lib/branding.ts'),
        'utf8'
      );
      expect(src).toContain('detectTenantSlug');
      expect(src).toContain('hostname');
    });

    it('hideEduSphereBranding flag present for white-label clients', () => {
      const src = readFileSync(
        resolve(ROOT, 'apps/web/src/lib/branding.ts'),
        'utf8'
      );
      expect(src).toContain('hideEduSphereBranding');
    });
  });

  describe('Database schema isolation', () => {
    it('tenant_branding table has unique tenantId constraint', () => {
      const src = readFileSync(
        resolve(ROOT, 'packages/db/src/schema/tenantBranding.ts'),
        'utf8'
      );
      expect(src).toContain('.unique()');
      expect(src).toContain('tenantId');
    });

    it('schema enforces foreign key to tenants table', () => {
      const src = readFileSync(
        resolve(ROOT, 'packages/db/src/schema/tenantBranding.ts'),
        'utf8'
      );
      expect(src).toContain('references(() => tenants');
    });

    it('schema exports are added to db schema index', () => {
      const src = readFileSync(
        resolve(ROOT, 'packages/db/src/schema/index.ts'),
        'utf8'
      );
      expect(src).toMatch(/tenantBranding/);
    });
  });
});
