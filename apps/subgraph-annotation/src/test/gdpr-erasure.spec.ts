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

const userAuth: AuthContext = {
  userId: 'user-gdpr',
  email: 'gdpr@e.com',
  username: 'gdprUser',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: [],
  isSuperAdmin: false,
};

const USER_ANNOTATION_1 = {
  id: 'ann-g1',
  asset_id: 'asset-1',
  user_id: 'user-gdpr',
  tenant_id: 'tenant-1',
  layer: 'PERSONAL',
  content: { text: 'Private study note with PII' },
  is_resolved: false,
  deleted_at: null,
  created_at: new Date('2026-01-15'),
};
const USER_ANNOTATION_2 = {
  id: 'ann-g2',
  asset_id: 'asset-2',
  user_id: 'user-gdpr',
  tenant_id: 'tenant-1',
  layer: 'SHARED',
  content: { text: 'Shared comment with name' },
  is_resolved: false,
  deleted_at: null,
  created_at: new Date('2026-02-01'),
};

describe('GDPR Erasure — annotation data lifecycle', () => {
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

  it('soft-delete cascades user erasure — each annotation is individually soft-deleted', async () => {
    // Simulate deleting each of user's annotations (GDPR right to erasure)
    // First annotation
    mockLimit.mockResolvedValueOnce([USER_ANNOTATION_1]);
    mockReturning.mockResolvedValueOnce([{ ...USER_ANNOTATION_1, deleted_at: new Date() }]);
    const del1 = await service.delete('ann-g1', userAuth);
    expect(del1).toBe(true);

    // Reset for second annotation
    vi.clearAllMocks();
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning, orderBy: mockOrderBy });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockUpdate.mockReturnValue({ set: mockSet });

    mockLimit.mockResolvedValueOnce([USER_ANNOTATION_2]);
    mockReturning.mockResolvedValueOnce([{ ...USER_ANNOTATION_2, deleted_at: new Date() }]);
    const del2 = await service.delete('ann-g2', userAuth);
    expect(del2).toBe(true);
  });

  it('anonymize annotation — update content to remove PII while keeping structure', async () => {
    // GDPR anonymization: replace PII content with anonymized version
    mockLimit.mockResolvedValue([USER_ANNOTATION_1]);
    const anonymized = {
      ...USER_ANNOTATION_1,
      content: { text: '[REDACTED]' },
    };
    mockReturning.mockResolvedValue([anonymized]);

    const result = await service.update(
      'ann-g1',
      { content: { text: '[REDACTED]' } },
      userAuth
    );
    expect(result.content).toEqual({ text: '[REDACTED]' });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ content: { text: '[REDACTED]' } })
    );
  });

  it('export user annotations for GDPR portability — findByUser returns all user data', async () => {
    // GDPR data portability: export all annotations for a user
    mockOffset.mockResolvedValue([USER_ANNOTATION_1, USER_ANNOTATION_2]);

    const annotations = await service.findByUser('user-gdpr', 100, 0, userAuth);
    expect(annotations).toHaveLength(2);
    expect(annotations[0].user_id).toBe('user-gdpr');
    expect(annotations[1].user_id).toBe('user-gdpr');
    // Each annotation contains the full content needed for data export
    expect(annotations[0].content).toBeDefined();
    expect(annotations[0].asset_id).toBeDefined();
    expect(annotations[0].created_at).toBeDefined();
  });
});
