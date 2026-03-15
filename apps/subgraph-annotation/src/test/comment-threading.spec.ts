import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from '@edusphere/auth';

// ─── Mock DB chain helpers ────────────────────────────────────────────
const mockReturning = vi.fn();
const mockLimit = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockOffset = vi.fn();
const mockFrom = vi.fn();
const mockValues = vi.fn();
const mockSet = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

const mockTx = {
  select: () => ({ from: mockFrom }),
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: {
    annotations: {
      id: 'id',
      asset_id: 'asset_id',
      user_id: 'user_id',
      layer: 'layer',
      deleted_at: 'deleted_at',
      tenant_id: 'tenant_id',
      created_at: 'created_at',
      parent_id: 'parent_id',
      annotation_type: 'annotation_type',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: string) => ({ desc: col })),
  sql: Object.assign(
    vi.fn((str: TemplateStringsArray) => str),
    { placeholder: vi.fn() }
  ),
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
  closeAllPools: vi.fn(),
}));

import { AnnotationService } from '../annotation/annotation.service';

const ownerAuth: AuthContext = {
  userId: 'user-1',
  email: 'u@e.com',
  username: 'user1',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: [],
  isSuperAdmin: false,
};
const instructorAuth: AuthContext = {
  userId: 'instr-1',
  email: 'i@e.com',
  username: 'instr',
  tenantId: 'tenant-1',
  roles: ['INSTRUCTOR'],
  scopes: [],
  isSuperAdmin: false,
};

const TOP_LEVEL = {
  id: 'top-1',
  asset_id: 'asset-1',
  user_id: 'user-1',
  tenant_id: 'tenant-1',
  layer: 'SHARED',
  annotation_type: 'TEXT',
  content: { text: 'Top-level comment' },
  parent_id: null,
  is_resolved: false,
  deleted_at: null,
  created_at: new Date(),
};
const REPLY_1 = {
  ...TOP_LEVEL,
  id: 'reply-1',
  content: { text: 'First reply' },
  parent_id: 'top-1',
};
const REPLY_2 = {
  ...TOP_LEVEL,
  id: 'reply-2',
  content: { text: 'Nested reply' },
  parent_id: 'reply-1',
};

describe('Comment Threading — nested annotation replies', () => {
  let service: AnnotationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
    mockOffset.mockResolvedValue([]);
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({
      limit: mockLimit,
      returning: mockReturning,
      orderBy: mockOrderBy,
    });
    mockOrderBy.mockReturnValue({ limit: mockLimit.mockReturnValue({ offset: mockOffset }) });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
    mockUpdate.mockReturnValue({ set: mockSet });
    service = new AnnotationService();
  });

  it('creates a top-level comment (parentId is null)', async () => {
    mockReturning.mockResolvedValue([TOP_LEVEL]);
    const result = await service.create(
      {
        assetId: 'asset-1',
        annotationType: 'TEXT',
        layer: 'SHARED',
        content: { text: 'Top-level comment' },
      },
      ownerAuth
    );
    expect(result.parent_id).toBeNull();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ parent_id: null })
    );
  });

  it('reply to comment creates nested annotation with parent_id', async () => {
    // findById returns parent
    mockLimit.mockResolvedValueOnce([TOP_LEVEL]);
    // insert returns reply
    mockReturning.mockResolvedValue([REPLY_1]);

    const result = await service.replyTo('top-1', 'First reply', ownerAuth);
    expect(result.parent_id).toBe('top-1');
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ parent_id: 'top-1' })
    );
  });

  it('deep nesting: reply to a reply creates depth-2 annotation', async () => {
    // findById returns the first reply (depth-1)
    mockLimit.mockResolvedValueOnce([REPLY_1]);
    // insert returns depth-2 reply
    mockReturning.mockResolvedValue([REPLY_2]);

    const result = await service.replyTo('reply-1', 'Nested reply', ownerAuth);
    expect(result.parent_id).toBe('reply-1');
  });

  it('soft-deleting a parent does not cascade to children (children remain)', async () => {
    // Delete the top-level comment
    mockLimit.mockResolvedValueOnce([TOP_LEVEL]);
    mockReturning.mockResolvedValue([{ ...TOP_LEVEL, deleted_at: new Date() }]);
    const deleted = await service.delete('top-1', ownerAuth);
    expect(deleted).toBe(true);

    // Only one update call — only parent is soft-deleted
    expect(mockUpdate).toHaveBeenCalledOnce();
    // Children (REPLY_1, REPLY_2) are NOT touched — they remain queryable
    // Verify the where clause targeted only the parent id
    const { eq } = await import('@edusphere/db');
    expect(eq).toHaveBeenCalledWith('id', 'top-1');
  });

  it('findAll returns both parents and replies in results (count aggregation)', async () => {
    const allComments = [TOP_LEVEL, REPLY_1, REPLY_2];
    mockOffset.mockResolvedValue(allComments);

    const results = await service.findAll(
      { limit: 50, offset: 0 },
      ownerAuth
    );
    expect(results).toHaveLength(3);
    const parentIds = results.map((a: { parent_id: string | null }) => a.parent_id);
    expect(parentIds).toContain(null); // top-level
    expect(parentIds).toContain('top-1'); // reply
    expect(parentIds).toContain('reply-1'); // nested reply
  });
});
