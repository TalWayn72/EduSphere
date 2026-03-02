import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./portal.service.js', () => ({
  PortalService: vi.fn(),
}));
vi.mock('@edusphere/db', () => ({}));

import { PortalResolver } from './portal.resolver.js';

/** Helper: build a minimal GqlContext with x-tenant-id header */
function makeCtx(tenantId?: string, userId?: string) {
  return {
    req: {
      headers: {
        'x-tenant-id': tenantId,
        'x-user-id': userId,
      },
    },
  };
}

/** Minimal DB page shape returned by PortalService */
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

  // ── myPortal ────────────────────────────────────────────────────────────────

  describe('myPortal()', () => {
    it('returns null when no x-tenant-id header is present', async () => {
      const result = await resolver.myPortal(makeCtx());
      expect(result).toBeNull();
      expect(portalService.getPortalPage).not.toHaveBeenCalled();
    });

    it('returns null when service returns null', async () => {
      portalService.getPortalPage.mockResolvedValue(null);
      const result = await resolver.myPortal(makeCtx('tenant-1'));
      expect(result).toBeNull();
    });

    it('maps page to GQL shape with ISO updatedAt', async () => {
      portalService.getPortalPage.mockResolvedValue(makePage());
      const result = await resolver.myPortal(makeCtx('tenant-1'));
      expect(result?.updatedAt).toBe('2026-01-01T12:00:00.000Z');
      expect(result?.id).toBe('page-1');
    });

    it('maps layout blocks to GQL blocks with JSON config', async () => {
      portalService.getPortalPage.mockResolvedValue(makePage());
      const result = await resolver.myPortal(makeCtx('tenant-1'));
      expect(result?.blocks).toHaveLength(1);
      expect(result?.blocks[0]?.type).toBe('HERO');
      expect(result?.blocks[0]?.config).toBe(
        JSON.stringify({ heading: 'Welcome' })
      );
    });
  });

  // ── publicPortal ────────────────────────────────────────────────────────────

  describe('publicPortal()', () => {
    it('returns null when no x-tenant-id header', async () => {
      const result = await resolver.publicPortal(makeCtx());
      expect(result).toBeNull();
    });

    it('delegates to getPublishedPortalPage and maps result', async () => {
      portalService.getPublishedPortalPage.mockResolvedValue(
        makePage({ published: true })
      );
      const result = await resolver.publicPortal(makeCtx('tenant-1'));
      expect(result?.published).toBe(true);
      expect(portalService.getPublishedPortalPage).toHaveBeenCalledWith(
        'tenant-1'
      );
    });

    it('returns null when no published page', async () => {
      portalService.getPublishedPortalPage.mockResolvedValue(null);
      const result = await resolver.publicPortal(makeCtx('tenant-1'));
      expect(result).toBeNull();
    });
  });

  // ── savePortalLayout ────────────────────────────────────────────────────────

  describe('savePortalLayout()', () => {
    it('parses blocksJson and delegates to service', async () => {
      const blocks = [{ id: 'blk-1', type: 'HERO', order: 0, config: {} }];
      portalService.createOrUpdatePortal.mockResolvedValue(makePage());
      await resolver.savePortalLayout(
        'Home Page',
        JSON.stringify(blocks),
        makeCtx('tenant-1', 'user-1')
      );
      expect(portalService.createOrUpdatePortal).toHaveBeenCalledWith(
        'tenant-1',
        blocks,
        'Home Page',
        'user-1'
      );
    });

    it('throws when x-tenant-id header is missing', async () => {
      await expect(
        resolver.savePortalLayout('Home', '[]', makeCtx())
      ).rejects.toThrow('Missing tenant context');
    });

    it('uses "unknown" as userId when x-user-id header is absent', async () => {
      const blocks: unknown[] = [];
      portalService.createOrUpdatePortal.mockResolvedValue(makePage());
      await resolver.savePortalLayout(
        'Home',
        JSON.stringify(blocks),
        makeCtx('tenant-1')
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
        makeCtx('tenant-1', 'user-1')
      );
      expect(result.updatedAt).toBe('2026-01-01T12:00:00.000Z');
    });
  });

  // ── publishPortal ───────────────────────────────────────────────────────────

  describe('publishPortal()', () => {
    it('calls service and returns true', async () => {
      portalService.publishPortal.mockResolvedValue(undefined);
      const result = await resolver.publishPortal(makeCtx('tenant-1'));
      expect(result).toBe(true);
      expect(portalService.publishPortal).toHaveBeenCalledWith('tenant-1');
    });

    it('returns false when no x-tenant-id header', async () => {
      const result = await resolver.publishPortal(makeCtx());
      expect(result).toBe(false);
      expect(portalService.publishPortal).not.toHaveBeenCalled();
    });
  });

  // ── unpublishPortal ─────────────────────────────────────────────────────────

  describe('unpublishPortal()', () => {
    it('calls service and returns true', async () => {
      portalService.unpublishPortal.mockResolvedValue(undefined);
      const result = await resolver.unpublishPortal(makeCtx('tenant-1'));
      expect(result).toBe(true);
      expect(portalService.unpublishPortal).toHaveBeenCalledWith('tenant-1');
    });

    it('returns false when no x-tenant-id header', async () => {
      const result = await resolver.unpublishPortal(makeCtx());
      expect(result).toBe(false);
      expect(portalService.unpublishPortal).not.toHaveBeenCalled();
    });
  });
});
