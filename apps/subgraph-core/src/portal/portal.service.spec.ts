/**
 * PortalService unit tests — F-037 No-Code Custom Portal Builder
 * 8 tests covering CRUD, publish/unpublish, block management, and validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockWithTenantContext = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    portalPages: {
      tenantId: 'tenantId',
      published: 'published',
    },
  },
  withTenantContext: mockWithTenantContext,
  eq: vi.fn((a: unknown, b: unknown) => ({ a, b, _eq: true })),
  ALLOWED_BLOCK_TYPES: ['HeroBanner', 'FeaturedCourses', 'StatWidget', 'TextBlock', 'ImageBlock', 'CTAButton'],
}));

let PortalService: typeof import('./portal.service.js').PortalService;
let _closeAllPools: () => Promise<void>;

beforeEach(async () => {
  vi.clearAllMocks();
  const dbMod = await import('@edusphere/db');
  _closeAllPools = dbMod.closeAllPools as () => Promise<void>;
  const mod = await import('./portal.service.js');
  PortalService = mod.PortalService;
});

function makeService() {
  return new PortalService();
}

// Helper: build a fake PortalPage row
function fakePortalPage(overrides: Partial<{
  id: string;
  tenantId: string;
  title: string;
  layout: unknown[];
  published: boolean;
  slug: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: 'page-1',
    tenantId: 'tenant-1',
    title: 'Learning Portal',
    layout: [],
    published: false,
    slug: 'home',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PortalService', () => {
  it('getPortalPage returns null when no portal exists', async () => {
    mockWithTenantContext.mockResolvedValue([]);
    const svc = makeService();
    const result = await svc.getPortalPage('tenant-no-portal');
    expect(result).toBeNull();
  });

  it('createOrUpdatePortal creates new page when none exists', async () => {
    // getPortalPage → returns []
    mockWithTenantContext.mockResolvedValueOnce([]);
    // insert → returns new page
    const newPage = fakePortalPage({ title: 'My Portal' });
    mockWithTenantContext.mockImplementationOnce(
      (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
        fn({
          insert: () => ({ values: () => ({ returning: () => [newPage] }) }),
        }),
    );

    const svc = makeService();
    const blocks = [{ id: 'b1', type: 'HeroBanner' as const, order: 0, config: {} }];
    const result = await svc.createOrUpdatePortal('tenant-1', blocks, 'My Portal', 'user-1');

    expect(result.title).toBe('My Portal');
  });

  it('createOrUpdatePortal updates existing page (upsert)', async () => {
    const existing = fakePortalPage();
    // getPortalPage → returns existing
    mockWithTenantContext.mockResolvedValueOnce([existing]);
    const updated = fakePortalPage({ title: 'Updated Portal' });
    mockWithTenantContext.mockImplementationOnce(
      (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
        fn({
          update: () => ({
            set: () => ({ where: () => ({ returning: () => [updated] }) }),
          }),
        }),
    );

    const svc = makeService();
    const result = await svc.createOrUpdatePortal('tenant-1', [], 'Updated Portal', 'user-1');
    expect(result.title).toBe('Updated Portal');
  });

  it('publishPortal sets published=true', async () => {
    const updateWhere = vi.fn().mockResolvedValue([]);
    mockWithTenantContext.mockImplementation(
      (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
        fn({ update: () => ({ set: () => ({ where: updateWhere }) }) }),
    );

    const svc = makeService();
    await svc.publishPortal('tenant-1');
    expect(updateWhere).toHaveBeenCalled();
  });

  it('unpublishPortal sets published=false', async () => {
    const updateWhere = vi.fn().mockResolvedValue([]);
    mockWithTenantContext.mockImplementation(
      (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
        fn({ update: () => ({ set: () => ({ where: updateWhere }) }) }),
    );

    const svc = makeService();
    await svc.unpublishPortal('tenant-1');
    expect(updateWhere).toHaveBeenCalled();
  });

  it('addBlock appends new block to existing layout', async () => {
    const existingBlock = { id: 'b0', type: 'TextBlock' as const, order: 0, config: {} };
    const existingPage = fakePortalPage({ layout: [existingBlock] });

    // getPortalPage (inside addBlock) → existing page
    mockWithTenantContext.mockResolvedValueOnce([existingPage]);
    // getPortalPage (inside createOrUpdatePortal) → existing page again
    mockWithTenantContext.mockResolvedValueOnce([existingPage]);
    // update call
    const updatedPage = fakePortalPage({ layout: [existingBlock, { id: 'b1', type: 'CTAButton', order: 1, config: {} }] });
    mockWithTenantContext.mockImplementationOnce(
      (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
        fn({ update: () => ({ set: () => ({ where: () => ({ returning: () => [updatedPage] }) }) }) }),
    );

    const svc = makeService();
    const newBlock = { id: 'b1', type: 'CTAButton' as const, order: 99, config: {} };
    const result = await svc.addBlock('tenant-1', newBlock, 'user-1');
    const layout = result.layout as Array<{ type: string }>;
    expect(layout.some((b) => b.type === 'CTAButton')).toBe(true);
  });

  it('removeBlock removes correct block by id', async () => {
    const blocks = [
      { id: 'b1', type: 'HeroBanner' as const, order: 0, config: {} },
      { id: 'b2', type: 'TextBlock' as const, order: 1, config: {} },
    ];
    const existingPage = fakePortalPage({ layout: blocks });

    // getPortalPage (inside removeBlock)
    mockWithTenantContext.mockResolvedValueOnce([existingPage]);
    // getPortalPage (inside createOrUpdatePortal)
    mockWithTenantContext.mockResolvedValueOnce([existingPage]);
    // update
    const updatedPage = fakePortalPage({ layout: [{ id: 'b2', type: 'TextBlock', order: 0, config: {} }] });
    mockWithTenantContext.mockImplementationOnce(
      (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
        fn({ update: () => ({ set: () => ({ where: () => ({ returning: () => [updatedPage] }) }) }) }),
    );

    const svc = makeService();
    const result = await svc.removeBlock('tenant-1', 'b1', 'user-1');
    const layout = result.layout as Array<{ id: string }>;
    expect(layout.every((b) => b.id !== 'b1')).toBe(true);
  });

  it('validateBlock throws BadRequestException on unknown block type', () => {
    const svc = makeService();
    const badBlock = { id: 'x', type: 'MaliciousBlock' as never, order: 0, config: {} };
    expect(() => {
      (svc as unknown as { validateBlock: (b: unknown) => void }).validateBlock(badBlock);
    }).toThrow(BadRequestException);
  });
});
