/**
 * portal.resolver.spec.ts — Unit tests for PortalResolver.
 *
 * Covers the authContext→header fallback pattern introduced when migrating
 * from `ctx.req.headers['x-tenant-id']` to `ctx.authContext?.tenantId`.
 *
 * Test matrix:
 *  1. authContext.tenantId preferred when present
 *  2. x-tenant-id header fallback when authContext missing
 *  3. Returns null/empty when no tenant context at all
 *  4. Regression guard: old ctx.req.user?.tenant_id does NOT work
 *  5. Service delegation with correct tenantId
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./portal.service.js', () => ({
  PortalService: vi.fn(),
}));
vi.mock('@edusphere/db', () => ({}));

import { PortalResolver } from './portal.resolver.js';
import type { GraphQLContext } from '../auth/auth.middleware.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build context with authContext (JWT-extracted tenant/user). */
function makeAuthCtx(
  tenantId?: string,
  userId?: string
): GraphQLContext {
  return {
    req: { headers: {} },
    authContext: tenantId
      ? { tenantId, userId: userId ?? 'user-from-jwt', email: 'a@b.com', roles: ['ORG_ADMIN'], scopes: [] }
      : undefined,
  } as unknown as GraphQLContext;
}

/** Build context with x-tenant-id header only (gateway fallback, no JWT). */
function makeHeaderCtx(
  tenantId?: string,
  userId?: string
): GraphQLContext {
  return {
    req: {
      headers: {
        ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
        ...(userId ? { 'x-user-id': userId } : {}),
      },
    },
  } as unknown as GraphQLContext;
}

/** Build context with BOTH authContext and header (authContext should win). */
function makeDualCtx(
  authTenantId: string,
  headerTenantId: string
): GraphQLContext {
  return {
    req: { headers: { 'x-tenant-id': headerTenantId } },
    authContext: { tenantId: authTenantId, userId: 'jwt-user', email: 'a@b.com', roles: ['ORG_ADMIN'], scopes: [] },
  } as unknown as GraphQLContext;
}

/** Build empty context — no authContext, no headers. */
function makeEmptyCtx(): GraphQLContext {
  return { req: { headers: {} } } as unknown as GraphQLContext;
}

/** Regression context: old pattern with ctx.req.user?.tenant_id */
function makeOldPatternCtx(tenantId: string): GraphQLContext {
  return {
    req: {
      headers: {},
      user: { tenant_id: tenantId },
    },
  } as unknown as GraphQLContext;
}

/** Minimal DB page shape returned by PortalService. */
function makePage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'page-1',
    title: 'Home',
    published: true,
    layout: [
      { id: 'blk-1', type: 'HERO', order: 0, config: { heading: 'Welcome' } },
    ],
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PortalResolver', () => {
  let resolver: PortalResolver;
  let portalService: {
    getPortalPage: ReturnType<typeof vi.fn>;
    getPublishedPortalPage: ReturnType<typeof vi.fn>;
    createOrUpdatePortal: ReturnType<typeof vi.fn>;
    publishPortal: ReturnType<typeof vi.fn>;
    unpublishPortal: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    portalService = {
      getPortalPage: vi.fn(),
      getPublishedPortalPage: vi.fn(),
      createOrUpdatePortal: vi.fn(),
      publishPortal: vi.fn(),
      unpublishPortal: vi.fn(),
    };
    resolver = new PortalResolver(portalService as never);
  });

  // ── extractTenantId: authContext preferred ─────────────────────────────────

  describe('extractTenantId — authContext preferred', () => {
    it('uses authContext.tenantId when present', async () => {
      portalService.getPortalPage.mockResolvedValue(makePage());
      await resolver.myPortal(makeAuthCtx('tenant-jwt'));
      expect(portalService.getPortalPage).toHaveBeenCalledWith('tenant-jwt');
    });

    it('prefers authContext.tenantId over x-tenant-id header', async () => {
      portalService.getPortalPage.mockResolvedValue(makePage());
      await resolver.myPortal(makeDualCtx('tenant-jwt', 'tenant-header'));
      expect(portalService.getPortalPage).toHaveBeenCalledWith('tenant-jwt');
    });
  });

  // ── extractTenantId: header fallback ──────────────────────────────────────

  describe('extractTenantId — header fallback', () => {
    it('falls back to x-tenant-id header when authContext is missing', async () => {
      portalService.getPortalPage.mockResolvedValue(makePage());
      await resolver.myPortal(makeHeaderCtx('tenant-header'));
      expect(portalService.getPortalPage).toHaveBeenCalledWith('tenant-header');
    });

    it('handles x-tenant-id as string array (takes first element)', async () => {
      const ctx = {
        req: { headers: { 'x-tenant-id': ['arr-tenant', 'ignored'] } },
      } as unknown as GraphQLContext;
      portalService.getPortalPage.mockResolvedValue(makePage());
      await resolver.myPortal(ctx);
      expect(portalService.getPortalPage).toHaveBeenCalledWith('arr-tenant');
    });
  });

  // ── extractTenantId: no tenant context ────────────────────────────────────

  describe('extractTenantId — no tenant context', () => {
    it('returns null when no authContext and no header', async () => {
      const result = await resolver.myPortal(makeEmptyCtx());
      expect(result).toBeNull();
      expect(portalService.getPortalPage).not.toHaveBeenCalled();
    });

    it('returns null when authContext exists but tenantId is undefined', async () => {
      const ctx = {
        req: { headers: {} },
        authContext: { userId: 'u1', email: 'a@b.com', roles: ['STUDENT'], scopes: [] },
      } as unknown as GraphQLContext;
      const result = await resolver.myPortal(ctx);
      expect(result).toBeNull();
    });
  });

  // ── Regression guard: old ctx.req.user?.tenant_id does NOT work ───────────

  describe('regression guard — old pattern ctx.req.user?.tenant_id', () => {
    it('does NOT extract tenantId from ctx.req.user.tenant_id (old pattern)', async () => {
      const result = await resolver.myPortal(makeOldPatternCtx('old-tenant'));
      expect(result).toBeNull();
      expect(portalService.getPortalPage).not.toHaveBeenCalled();
    });

    it('publicPortal ignores ctx.req.user.tenant_id', async () => {
      const result = await resolver.publicPortal(makeOldPatternCtx('old-tenant'));
      expect(result).toBeNull();
      expect(portalService.getPublishedPortalPage).not.toHaveBeenCalled();
    });

    it('publishPortal returns false with old pattern context', async () => {
      const result = await resolver.publishPortal(makeOldPatternCtx('old-tenant'));
      expect(result).toBe(false);
      expect(portalService.publishPortal).not.toHaveBeenCalled();
    });

    it('savePortalLayout throws with old pattern context', async () => {
      await expect(
        resolver.savePortalLayout('Title', '[]', makeOldPatternCtx('old-tenant'))
      ).rejects.toThrow('Missing tenant context');
    });
  });

  // ── myPortal ──────────────────────────────────────────────────────────────

  describe('myPortal()', () => {
    it('returns null when service returns null', async () => {
      portalService.getPortalPage.mockResolvedValue(null);
      const result = await resolver.myPortal(makeAuthCtx('tenant-1'));
      expect(result).toBeNull();
    });

    it('maps page to GQL shape with ISO updatedAt', async () => {
      portalService.getPortalPage.mockResolvedValue(makePage());
      const result = await resolver.myPortal(makeAuthCtx('tenant-1'));
      expect(result?.updatedAt).toBe('2026-01-01T12:00:00.000Z');
      expect(result?.id).toBe('page-1');
    });

    it('maps layout blocks to GQL blocks with JSON config', async () => {
      portalService.getPortalPage.mockResolvedValue(makePage());
      const result = await resolver.myPortal(makeAuthCtx('tenant-1'));
      expect(result?.blocks).toHaveLength(1);
      expect(result?.blocks[0]?.type).toBe('HERO');
      expect(result?.blocks[0]?.config).toBe(
        JSON.stringify({ heading: 'Welcome' })
      );
    });
  });

  // ── publicPortal ──────────────────────────────────────────────────────────

  describe('publicPortal()', () => {
    it('returns null when no tenant context', async () => {
      const result = await resolver.publicPortal(makeEmptyCtx());
      expect(result).toBeNull();
    });

    it('delegates to getPublishedPortalPage with authContext tenantId', async () => {
      portalService.getPublishedPortalPage.mockResolvedValue(
        makePage({ published: true })
      );
      const result = await resolver.publicPortal(makeAuthCtx('tenant-1'));
      expect(result?.published).toBe(true);
      expect(portalService.getPublishedPortalPage).toHaveBeenCalledWith(
        'tenant-1'
      );
    });

    it('delegates to getPublishedPortalPage with header fallback', async () => {
      portalService.getPublishedPortalPage.mockResolvedValue(
        makePage({ published: true })
      );
      await resolver.publicPortal(makeHeaderCtx('header-tenant'));
      expect(portalService.getPublishedPortalPage).toHaveBeenCalledWith(
        'header-tenant'
      );
    });

    it('returns null when no published page', async () => {
      portalService.getPublishedPortalPage.mockResolvedValue(null);
      const result = await resolver.publicPortal(makeAuthCtx('tenant-1'));
      expect(result).toBeNull();
    });
  });

  // ── savePortalLayout ──────────────────────────────────────────────────────

  describe('savePortalLayout()', () => {
    it('parses blocksJson and delegates with authContext tenantId + userId', async () => {
      const blocks = [{ id: 'blk-1', type: 'HERO', order: 0, config: {} }];
      portalService.createOrUpdatePortal.mockResolvedValue(makePage());
      const ctx = makeAuthCtx('tenant-1', 'jwt-user-1');
      await resolver.savePortalLayout('Home Page', JSON.stringify(blocks), ctx);
      expect(portalService.createOrUpdatePortal).toHaveBeenCalledWith(
        'tenant-1',
        blocks,
        'Home Page',
        'jwt-user-1'
      );
    });

    it('uses header fallback for tenantId and userId', async () => {
      const blocks: unknown[] = [];
      portalService.createOrUpdatePortal.mockResolvedValue(makePage());
      await resolver.savePortalLayout(
        'Home',
        JSON.stringify(blocks),
        makeHeaderCtx('header-t', 'header-u')
      );
      expect(portalService.createOrUpdatePortal).toHaveBeenCalledWith(
        'header-t',
        blocks,
        'Home',
        'header-u'
      );
    });

    it('throws when no tenant context at all', async () => {
      await expect(
        resolver.savePortalLayout('Home', '[]', makeEmptyCtx())
      ).rejects.toThrow('Missing tenant context');
    });

    it('uses "unknown" as userId when no authContext and no x-user-id header', async () => {
      const blocks: unknown[] = [];
      portalService.createOrUpdatePortal.mockResolvedValue(makePage());
      await resolver.savePortalLayout(
        'Home',
        JSON.stringify(blocks),
        makeHeaderCtx('tenant-1')
      );
      expect(portalService.createOrUpdatePortal).toHaveBeenCalledWith(
        'tenant-1',
        blocks,
        'Home',
        'unknown'
      );
    });

    it('maps returned page to GQL shape', async () => {
      portalService.createOrUpdatePortal.mockResolvedValue(makePage());
      const result = await resolver.savePortalLayout(
        'Home',
        '[]',
        makeAuthCtx('tenant-1', 'user-1')
      );
      expect(result.updatedAt).toBe('2026-01-01T12:00:00.000Z');
    });
  });

  // ── publishPortal ─────────────────────────────────────────────────────────

  describe('publishPortal()', () => {
    it('delegates with authContext tenantId and returns true', async () => {
      portalService.publishPortal.mockResolvedValue(undefined);
      const result = await resolver.publishPortal(makeAuthCtx('tenant-1'));
      expect(result).toBe(true);
      expect(portalService.publishPortal).toHaveBeenCalledWith('tenant-1');
    });

    it('delegates with header fallback tenantId', async () => {
      portalService.publishPortal.mockResolvedValue(undefined);
      const result = await resolver.publishPortal(makeHeaderCtx('header-t'));
      expect(result).toBe(true);
      expect(portalService.publishPortal).toHaveBeenCalledWith('header-t');
    });

    it('returns false when no tenant context', async () => {
      const result = await resolver.publishPortal(makeEmptyCtx());
      expect(result).toBe(false);
      expect(portalService.publishPortal).not.toHaveBeenCalled();
    });
  });

  // ── unpublishPortal ───────────────────────────────────────────────────────

  describe('unpublishPortal()', () => {
    it('delegates with authContext tenantId and returns true', async () => {
      portalService.unpublishPortal.mockResolvedValue(undefined);
      const result = await resolver.unpublishPortal(makeAuthCtx('tenant-1'));
      expect(result).toBe(true);
      expect(portalService.unpublishPortal).toHaveBeenCalledWith('tenant-1');
    });

    it('delegates with header fallback tenantId', async () => {
      portalService.unpublishPortal.mockResolvedValue(undefined);
      const result = await resolver.unpublishPortal(makeHeaderCtx('hdr-t'));
      expect(result).toBe(true);
      expect(portalService.unpublishPortal).toHaveBeenCalledWith('hdr-t');
    });

    it('returns false when no tenant context', async () => {
      const result = await resolver.unpublishPortal(makeEmptyCtx());
      expect(result).toBe(false);
      expect(portalService.unpublishPortal).not.toHaveBeenCalled();
    });
  });
});
