# Phase 42 — White-Label Runtime Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` + `subagent-driven-development` + `nestjs-best-practices`
> **Context:** Phase 41 complete (commit ae129f0). Phase 42 activates the already-built white-label infrastructure at runtime.

---

## Context — What's Already Built

| Component | Location | Status |
|-----------|----------|--------|
| `tenant_branding` DB table | `packages/db/src/schema/tenantBranding.ts` | ✅ Full schema (logoUrl, colors, font, customCss, hideEduSphereBranding) |
| `TenantBrandingService` | `apps/subgraph-core/src/tenant/tenant-branding.service.ts` | ✅ get/update |
| GraphQL: `myTenantBranding` query | `apps/subgraph-core/src/tenant/tenant.graphql` + supergraph | ✅ authenticated query |
| GraphQL: `updateTenantBranding` | same | ✅ ORG_ADMIN only |
| `branding.ts` | `apps/web/src/lib/branding.ts` | ✅ `applyTenantBranding()` + `hexToHsl()` + `detectTenantSlug()` |
| `branding.queries.ts` | `apps/web/src/lib/graphql/branding.queries.ts` | ✅ `TENANT_BRANDING_QUERY` + `UPDATE_TENANT_BRANDING_MUTATION` |
| `BrandingSettingsPage` | `apps/web/src/pages/BrandingSettingsPage.tsx` | ✅ Admin branding form |
| AppSidebar hardcoded "EduSphere" | `apps/web/src/components/AppSidebar.tsx:101` | ❌ Not connected to branding |

## What's MISSING (Phase 42 gaps)

1. **`useTenantBranding` hook** — nobody fetches + applies branding at startup
2. **App.tsx integration** — `applyTenantBranding()` never called during app boot
3. **AppSidebar dynamic logo** — hardcoded "EduSphere" text + icon at line 101
4. **`customCss` injection** — `tenant_branding.custom_css` exists in DB but never injected into DOM
5. **`hideEduSphereBranding`** — flag exists but no code checks it
6. **Public branding REST endpoint** — login page needs branding BEFORE auth (for colored login screen)

---

## Architecture

```
App boots → BrandingApplier component (inside urql client) →
  useTenantBranding() → urql useQuery(myTenantBranding) →
    applyTenantBranding() → CSS custom properties on :root
    injectCustomCss()     → <style id="tenant-css"> in <head>
    document.title        → organizationName
    favicon               → faviconUrl

AppSidebar → useBranding() (from context) →
  shows branding.logoUrl + branding.organizationName
  hides "EduSphere" text when hideEduSphereBranding=true

Public pages (login, portal) → REST GET /api/branding?slug={tenant} →
  returns {primaryColor, logoUrl, organizationName} without auth
```

---

## Sprint A — `useTenantBranding` hook + App integration (1 day)

### Agent-A1: useTenantBranding hook

**File: `apps/web/src/hooks/useTenantBranding.ts`** (NEW, ~60 lines)

```typescript
import { useEffect } from 'react';
import { useQuery } from 'urql';
import { TENANT_BRANDING_QUERY } from '@/lib/graphql/branding.queries';
import { applyTenantBranding, DEFAULT_BRANDING, type TenantBrandingData } from '@/lib/branding';

function injectCustomCss(css: string | null | undefined): void {
  const id = 'tenant-custom-css';
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!css) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

interface TenantBrandingResult {
  myTenantBranding: TenantBrandingData & { customCss?: string | null };
}

export function useTenantBranding() {
  const [{ data, fetching }] = useQuery<TenantBrandingResult>({
    query: TENANT_BRANDING_QUERY,
    requestPolicy: 'cache-and-network',
  });

  useEffect(() => {
    const branding = data?.myTenantBranding;
    if (!branding) return;
    applyTenantBranding(branding);
    injectCustomCss(branding.customCss);
  }, [data]);

  return {
    branding: data?.myTenantBranding ?? DEFAULT_BRANDING,
    fetching,
  };
}
```

**Modify: `apps/web/src/lib/graphql/branding.queries.ts`**

Add `customCss` to `TENANT_BRANDING_QUERY`:
```graphql
myTenantBranding {
  # ... existing fields ...
  customCss       # ADD THIS
  hideEduSphereBranding
}
```

**Modify: `apps/subgraph-core/src/tenant/tenant.graphql`**

Verify `customCss` field is in `TenantBranding` type (check; add if missing).

**Modify: `apps/gateway/supergraph.graphql`**

Add `customCss: String` to `TenantBranding` type if not already there.

**File: `apps/web/src/contexts/BrandingContext.tsx`** (NEW, ~40 lines)

```typescript
import React, { createContext, useContext } from 'react';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { DEFAULT_BRANDING, type TenantBrandingData } from '@/lib/branding';

interface BrandingContextValue {
  branding: TenantBrandingData & { customCss?: string | null };
  fetching: boolean;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  fetching: false,
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const value = useTenantBranding();
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
```

**Modify: `apps/web/src/App.tsx`**

Read the file, then add `BrandingProvider` INSIDE the urql client provider (so it has GraphQL access) but OUTSIDE the Router:

```tsx
// Add inside the providers stack, after the urql client:
<BrandingProvider>
  {/* existing content */}
</BrandingProvider>
```

**Test: `apps/web/src/hooks/useTenantBranding.test.ts`** (NEW, 5 tests)

Mock urql `useQuery` and `applyTenantBranding`. Test:
1. calls `applyTenantBranding` when data arrives
2. does NOT call `applyTenantBranding` while fetching
3. `injectCustomCss` adds `<style id="tenant-custom-css">` to head
4. `injectCustomCss` removes style when css is null
5. returns `DEFAULT_BRANDING` when no data

**Test: `apps/web/src/contexts/BrandingContext.test.tsx`** (NEW, 3 tests)
1. `useBranding()` returns default branding without provider
2. returns branding from hook when data loads
3. `fetching: true` propagated correctly

---

### Agent-A2: AppSidebar dynamic branding

**Modify: `apps/web/src/components/AppSidebar.tsx`**

Read the full file first. Then:

1. Import `useBranding` from `@/contexts/BrandingContext`
2. Call `const { branding } = useBranding()` at the top of the component
3. Replace hardcoded `EduSphere` text (line 101) with `{branding.organizationName}`
4. Replace sidebar logo icon with conditional:
   - If `branding.logoUrl !== '/defaults/logo.svg'`: show `<img src={branding.logoUrl} alt={branding.organizationName} className="h-8 w-8 object-contain" />`
   - Otherwise: keep the existing icon
5. If `branding.hideEduSphereBranding`: hide the static "EduSphere" attribution text (if it exists anywhere in the sidebar)

**Test: `apps/web/src/components/AppSidebar.test.tsx`** (MODIFY — add 4 new tests)

Read existing tests first. Add:
1. renders `organizationName` from branding (not hardcoded "EduSphere")
2. renders custom logo `<img>` when `logoUrl` is not default
3. shows "EduSphere" icon when `logoUrl` is default
4. hides `hideEduSphereBranding` text when flag is true

Mock `useBranding` in the test file:
```typescript
vi.mock('@/contexts/BrandingContext', () => ({
  useBranding: vi.fn(() => ({
    branding: { ...DEFAULT_BRANDING, organizationName: 'AcmeCorp', logoUrl: '/defaults/logo.svg', hideEduSphereBranding: false },
    fetching: false,
  })),
}));
```

---

## Sprint B — Public Branding REST Endpoint (1 day)

### Agent-B1: Public branding endpoint (Backend)

**Purpose:** The login page, public portal, and tenant landing page need branding BEFORE authentication.

**Modify: `apps/subgraph-core/src/tenant/tenant.graphql`**

Add public branding query (no `@authenticated`):
```graphql
extend type Query {
  publicBranding(slug: String!): PublicTenantBranding
}

type PublicTenantBranding {
  primaryColor: String!
  accentColor: String!
  logoUrl: String!
  organizationName: String!
  tagline: String
  faviconUrl: String!
}
```

**Modify: `apps/subgraph-core/src/tenant/tenant-branding.service.ts`**

Add:
```typescript
async getPublicBranding(slug: string): Promise<PublicBrandingResult | null> {
  // Look up tenant by slug (requires join with tenants table)
  // Return only safe public fields (no customCss, no hideEduSphereBranding)
  const result = await db
    .select({ primaryColor: tenantBranding.primaryColor, /* ... */ })
    .from(tenantBranding)
    .innerJoin(tenants, eq(tenants.id, tenantBranding.tenantId))
    .where(eq(tenants.slug, slug))
    .limit(1);
  return result[0] ?? null;
}
```

**Modify: `apps/subgraph-core/src/tenant/tenant.resolver.ts`**

Add `@Query('publicBranding')` resolver (no auth guard, public).

**Modify: `apps/gateway/supergraph.graphql`**

Add `publicBranding(slug: String!): PublicTenantBranding` to Query.

**Test: 3 unit tests** (slug found → returns branding, slug not found → null, missing slug → null)

---

### Agent-B2: Public branding on Login page (Frontend)

**File: `apps/web/src/hooks/usePublicBranding.ts`** (NEW, ~40 lines)

```typescript
import { useEffect } from 'react';
import { useQuery } from 'urql';
import { gql } from 'urql';
import { applyTenantBranding, detectTenantSlug, DEFAULT_BRANDING } from '@/lib/branding';

const PUBLIC_BRANDING_QUERY = gql`
  query PublicBranding($slug: String!) {
    publicBranding(slug: $slug) {
      primaryColor
      accentColor
      logoUrl
      organizationName
      tagline
      faviconUrl
    }
  }
`;

export function usePublicBranding() {
  const slug = detectTenantSlug();
  const [{ data }] = useQuery({
    query: PUBLIC_BRANDING_QUERY,
    variables: { slug: slug ?? '' },
    pause: !slug, // skip on main domain (no slug detected)
  });

  useEffect(() => {
    if (data?.publicBranding) {
      applyTenantBranding({
        ...DEFAULT_BRANDING,
        ...data.publicBranding,
        secondaryColor: DEFAULT_BRANDING.secondaryColor,
        backgroundColor: DEFAULT_BRANDING.backgroundColor,
        fontFamily: DEFAULT_BRANDING.fontFamily,
        hideEduSphereBranding: false,
      });
    }
  }, [data]);

  return data?.publicBranding ?? null;
}
```

**Modify: `apps/web/src/pages/LoginPage.tsx` (or auth flow entry)**

Read the current login page. Add `usePublicBranding()` call at the top. Use the returned branding to show tenant logo on the login card.

**Test: `apps/web/src/hooks/usePublicBranding.test.ts`** (3 tests)
1. pauses when no slug detected
2. applies branding on data load
3. returns null on main domain

---

## Sprint C — QA Gate (1 day)

### Agent-C1: E2E + security tests

**File: `apps/web/e2e/white-label.spec.ts`** (NEW, ~20 tests)

```typescript
import { test, expect } from '@playwright/test';

function mockBrandingGraphQL(page, branding = {}) {
  return page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON();
    if (body?.query?.includes('myTenantBranding') || body?.query?.includes('TenantBranding')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            myTenantBranding: {
              logoUrl: '/defaults/logo.svg',
              logoMarkUrl: null,
              faviconUrl: '/defaults/favicon.ico',
              primaryColor: '#7c3aed',  // purple — visible diff from default blue
              secondaryColor: '#64748b',
              accentColor: '#f59e0b',
              backgroundColor: '#ffffff',
              fontFamily: 'Inter',
              organizationName: 'AcmeCorp',
              tagline: 'Learn Better',
              privacyPolicyUrl: null,
              termsOfServiceUrl: null,
              supportEmail: null,
              hideEduSphereBranding: false,
              customCss: null,
              ...branding,
            },
          },
        }),
      });
      return;
    }
    await route.continue();
  });
}

test.describe('White-label branding', () => {
  test('sidebar shows tenant organizationName', async ({ page }) => {
    await mockBrandingGraphQL(page, { organizationName: 'AcmeCorp' });
    await page.goto('/dashboard');
    await expect(page.getByTestId('sidebar-brand-name')).toContainText('AcmeCorp');
  });

  test('customCss is injected into document head', async ({ page }) => {
    await mockBrandingGraphQL(page, { customCss: '.custom-brand { color: red; }' });
    await page.goto('/dashboard');
    const customStyle = await page.evaluate(() => document.getElementById('tenant-custom-css')?.textContent);
    expect(customStyle).toContain('.custom-brand');
  });

  test('primary color CSS variable applied', async ({ page }) => {
    await mockBrandingGraphQL(page, { primaryColor: '#7c3aed' });
    await page.goto('/dashboard');
    const cssVar = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
    );
    expect(cssVar).toBeTruthy();
    expect(cssVar).not.toBe('');
  });

  test('does NOT show raw branding errors', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).not.toContainText('[GraphQL]');
    await expect(page.locator('body')).not.toContainText('TypeError');
  });

  test('visual regression — dashboard with custom branding', async ({ page }) => {
    await mockBrandingGraphQL(page, { organizationName: 'AcmeCorp', primaryColor: '#7c3aed' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('white-label-dashboard.png', { maxDiffPixels: 800 });
  });
});
```

**Security tests to add to `tests/security/api-security.spec.ts`:**
```typescript
describe('Phase 42: White-Label Security', () => {
  it('publicBranding query excludes customCss and hideEduSphereBranding', () => {
    const sdl = readFileSync(join(__dirname, '../../apps/subgraph-core/src/tenant/tenant.graphql'), 'utf8');
    const publicBrandingType = sdl.match(/type PublicTenantBranding\s*\{([^}]+)\}/s)?.[1] ?? '';
    expect(publicBrandingType).not.toContain('customCss');
    expect(publicBrandingType).not.toContain('hideEduSphereBranding');
  });

  it('customCss injection uses textContent not innerHTML (XSS safe)', () => {
    const hookSrc = readFileSync(join(__dirname, '../../apps/web/src/hooks/useTenantBranding.ts'), 'utf8');
    expect(hookSrc).toContain('textContent');
    expect(hookSrc).not.toContain('innerHTML');
  });

  it('useTenantBranding uses cache-and-network — fresh branding on each load', () => {
    const hookSrc = readFileSync(join(__dirname, '../../apps/web/src/hooks/useTenantBranding.ts'), 'utf8');
    expect(hookSrc).toContain('cache-and-network');
  });
});
```

### Agent-C2: Docs

**Update: `OPEN_ISSUES.md`** — add Phase 42 entry
**Update: `README.md`** — add Phase 42 row (🟡 In Progress)
**Update: `CHANGELOG.md`** — add [0.42.0] entry

---

## Dependency Graph

```
Sprint A (parallel):
  A1 (useTenantBranding hook + BrandingContext + App.tsx) — no deps
  A2 (AppSidebar dynamic branding) — needs A1's BrandingContext to be complete

Sprint B (parallel with A):
  B1 (publicBranding backend) — no deps
  B2 (usePublicBranding + Login) — after B1 adds GraphQL schema

Sprint C (after A+B):
  C1 (E2E + security) — parallel
  C2 (Docs) — parallel with C1
```

---

## Critical File Paths

| File | Status |
|------|--------|
| `apps/web/src/hooks/useTenantBranding.ts` | NEW |
| `apps/web/src/contexts/BrandingContext.tsx` | NEW |
| `apps/web/src/hooks/usePublicBranding.ts` | NEW |
| `apps/web/src/hooks/useTenantBranding.test.ts` | NEW |
| `apps/web/src/contexts/BrandingContext.test.tsx` | NEW |
| `apps/web/src/hooks/usePublicBranding.test.ts` | NEW |
| `apps/web/src/App.tsx` | MODIFY — add BrandingProvider |
| `apps/web/src/components/AppSidebar.tsx` | MODIFY — dynamic org name + logo |
| `apps/web/src/components/AppSidebar.test.tsx` | MODIFY — +4 branding tests |
| `apps/web/src/lib/graphql/branding.queries.ts` | MODIFY — add customCss field |
| `apps/subgraph-core/src/tenant/tenant.graphql` | MODIFY — add publicBranding + PublicTenantBranding type |
| `apps/subgraph-core/src/tenant/tenant-branding.service.ts` | MODIFY — add getPublicBranding() |
| `apps/subgraph-core/src/tenant/tenant.resolver.ts` | MODIFY — add publicBranding resolver |
| `apps/gateway/supergraph.graphql` | MODIFY — add publicBranding + PublicTenantBranding |
| `apps/web/e2e/white-label.spec.ts` | NEW |
| `tests/security/api-security.spec.ts` | MODIFY — +3 white-label security tests |

---

## Security Invariants

| Check | Rule |
|-------|------|
| `customCss` injection | Use `el.textContent = css` NOT `el.innerHTML` (XSS) |
| `publicBranding` response | NEVER return `customCss`, `hideEduSphereBranding`, or internal tenant IDs |
| `publicBranding` resolver | No `@authenticated` — but limited to safe public fields only |
| Branding colors | `hexToHsl()` validation — reject invalid hex to prevent CSS injection |

---

## Expected Test Delta

| Package | Before | After | Delta |
|---------|--------|-------|-------|
| Web unit | 3,933 | ~3,955+ | +22 (hook, context, sidebar, public) |
| subgraph-core | existing | +3 | (publicBranding) |
| Security | 26 api-security | +3 | (white-label) |
| E2E | ~109 | ~114 | +5 (white-label) |
