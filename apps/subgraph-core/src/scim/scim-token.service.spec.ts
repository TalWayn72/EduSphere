import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted - use vi.fn() inline without referencing outer variables
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    scimTokens: {
      id: 'id',
      tenantId: 'tenant_id',
      tokenHash: 'token_hash',
      isActive: 'is_active',
      lastUsedAt: 'last_used_at',
    },
  },
  withTenantContext: vi.fn(),
  eq: vi.fn((a, b) => ({ a, b })),
  and: vi.fn((...args) => args),
}));

import { ScimTokenService } from './scim-token.service.js';

const BASE_ROW = {
  id: 'token-1',
  tenantId: 'tenant-1',
  tokenHash: 'fakehash',
  description: 'Workday integration',
  createdByUserId: 'user-1',
  lastUsedAt: null,
  expiresAt: null,
  isActive: true,
  createdAt: new Date('2026-01-01'),
};

describe('ScimTokenService', () => {
  let service: ScimTokenService;
  let withTenantContextMock: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockValues: ReturnType<typeof vi.fn>;
  let mockReturning: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockWhere: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockLimit: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockReturning = vi.fn().mockResolvedValue([BASE_ROW]);
    mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    mockInsert = vi.fn().mockReturnValue({ values: mockValues });
    mockSet = vi.fn();
    mockWhere = vi.fn().mockResolvedValue(undefined);
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
    mockLimit = vi.fn().mockResolvedValue([BASE_ROW]);
    mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: mockLimit }),
      limit: mockLimit,
    });
    mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    const { withTenantContext } = await import('@edusphere/db');
    withTenantContextMock = vi.mocked(withTenantContext);
    withTenantContextMock.mockImplementation(async (_db, _ctx, fn) =>
      fn({
        insert: mockInsert,
        update: mockUpdate,
        select: mockSelect,
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      })
    );

    service = new ScimTokenService();
    Object.assign(service, {
      db: { select: mockSelect, update: mockUpdate, insert: mockInsert },
    });
  });

  it('generateToken returns rawToken and stores hash (not raw)', async () => {
    const result = await service.generateToken('tenant-1', 'user-1', 'Workday');
    expect(result.rawToken).toBeTruthy();
    expect(result.rawToken).toHaveLength(64);
    expect(result.token.id).toBe('token-1');
    expect(result.token.description).toBe('Workday integration');
    const insertArg = mockValues.mock.calls[0]?.[0];
    expect(insertArg?.tokenHash).not.toBe(result.rawToken);
    expect(insertArg?.tokenHash).toHaveLength(64);
  });

  it('generateToken with expiresInDays sets expires_at', async () => {
    await service.generateToken('tenant-1', 'user-1', 'BambooHR', 30);
    const insertArg = mockValues.mock.calls[0]?.[0];
    expect(insertArg?.expiresAt).toBeInstanceOf(Date);
    const diffDays = (insertArg.expiresAt.getTime() - Date.now()) / 86400000;
    expect(diffDays).toBeGreaterThan(29);
  });

  it('validateToken returns tenantId for valid token', async () => {
    mockFrom.mockReturnValueOnce({
      where: vi
        .fn()
        .mockReturnValue({ limit: vi.fn().mockResolvedValue([BASE_ROW]) }),
    });
    const result = await service.validateToken(
      'some-valid-raw-token-padded-to-64chars-exactly-here'
    );
    expect(result).not.toBeNull();
    expect(result?.tenantId).toBe('tenant-1');
    expect(result?.tokenId).toBe('token-1');
  });

  it('validateToken rejects expired token', async () => {
    const expired = { ...BASE_ROW, expiresAt: new Date('2020-01-01') };
    mockFrom.mockReturnValueOnce({
      where: vi
        .fn()
        .mockReturnValue({ limit: vi.fn().mockResolvedValue([expired]) }),
    });
    const result = await service.validateToken(
      'some-raw-token-expired-padded-to-64-chars-exactly'
    );
    expect(result).toBeNull();
  });

  it('validateToken rejects inactive token', async () => {
    const inactive = { ...BASE_ROW, isActive: false };
    mockFrom.mockReturnValueOnce({
      where: vi
        .fn()
        .mockReturnValue({ limit: vi.fn().mockResolvedValue([inactive]) }),
    });
    const result = await service.validateToken(
      'some-raw-token-inactive-padded-to-64-chars-exactly'
    );
    expect(result).toBeNull();
  });

  it('validateToken rejects unknown token', async () => {
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
    });
    const result = await service.validateToken(
      'unknown-token-not-in-database-padded-to-64-chars-x'
    );
    expect(result).toBeNull();
  });

  it('revokeToken sets is_active = false', async () => {
    const result = await service.revokeToken('tenant-1', 'token-1');
    expect(result).toBe(true);
    expect(mockSet).toHaveBeenCalledWith({ isActive: false });
  });

  it('listTokens never exposes raw token — only metadata fields', async () => {
    withTenantContextMock.mockImplementationOnce(async (_db, _ctx, fn) =>
      fn({
        insert: mockInsert,
        update: mockUpdate,
        select: () => ({
          from: () => ({ where: () => Promise.resolve([BASE_ROW]) }),
        }),
      })
    );
    const tokens = await service.listTokens('tenant-1');
    expect(tokens).toHaveLength(1);
    const token = tokens[0];
    expect(token).not.toHaveProperty('tokenHash');
    expect(token).not.toHaveProperty('rawToken');
    expect(token).toHaveProperty('id');
    expect(token).toHaveProperty('description');
    expect(token).toHaveProperty('isActive');
  });
});
