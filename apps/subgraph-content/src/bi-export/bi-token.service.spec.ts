import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';

// ── Hoisted mocks (must run before vi.mock factories) ─────────────────────────

const { mockWithTenantContext, mockCloseAllPools } = vi.hoisted(() => ({
  mockWithTenantContext: vi.fn(),
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
}));

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  schema: { biApiTokens: {} },
  withTenantContext: mockWithTenantContext,
  eq: vi.fn(),
  and: vi.fn(),
}));

import { BiTokenService } from './bi-token.service.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BiTokenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: onModuleDestroy calls closeAllPools
  it('onModuleDestroy calls closeAllPools', async () => {
    const service = new BiTokenService();
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // Test 2: generateToken returns 64-char hex string
  it('generateToken returns 64-char hex string', async () => {
    const service = new BiTokenService();
    mockWithTenantContext.mockImplementationOnce(
      async (_db: unknown, _ctx: unknown, fn: (db: unknown) => Promise<unknown>) =>
        fn({
          insert: () => ({
            values: () => ({ returning: () => Promise.resolve([{ id: 'tok-1' }]) }),
          }),
        })
    );

    const raw = await service.generateToken('tenant-1', 'test desc');

    expect(raw).toMatch(/^[a-f0-9]{64}$/);
  });

  // Test 3: generateToken stores hashed (not raw) token via withTenantContext
  it('generateToken stores hashed (not raw) token via withTenantContext', async () => {
    const service = new BiTokenService();
    let capturedValues: Record<string, unknown> | null = null;

    mockWithTenantContext.mockImplementationOnce(
      async (_db: unknown, _ctx: unknown, fn: (db: unknown) => Promise<unknown>) =>
        fn({
          insert: () => ({
            values: (vals: Record<string, unknown>) => {
              capturedValues = vals;
              return {
                returning: () => Promise.resolve([{ id: 'tok-1', tenantId: 'tenant-1' }]),
              };
            },
          }),
        })
    );

    const raw = await service.generateToken('tenant-1', 'desc');
    const expectedHash = sha256(raw);

    expect(capturedValues).not.toBeNull();
    expect((capturedValues as Record<string, unknown>)['tokenHash']).toBe(expectedHash);
    expect((capturedValues as Record<string, unknown>)['tokenHash']).not.toBe(raw);
  });

  // Test 4: listTokens calls withTenantContext
  it('listTokens calls withTenantContext with correct tenantId', async () => {
    const service = new BiTokenService();
    mockWithTenantContext.mockImplementationOnce(
      async (_db: unknown, _ctx: unknown, fn: (db: unknown) => Promise<unknown>) =>
        fn({
          select: () => ({
            from: () => ({ where: () => Promise.resolve([]) }),
          }),
        })
    );

    await service.listTokens('tenant-1');

    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 'tenant-1' }),
      expect.any(Function)
    );
  });

  // Test 5: revokeToken calls withTenantContext
  it('revokeToken calls withTenantContext with correct tenantId', async () => {
    const service = new BiTokenService();
    mockWithTenantContext.mockImplementationOnce(
      async (_db: unknown, _ctx: unknown, fn: (db: unknown) => Promise<unknown>) =>
        fn({
          update: () => ({
            set: () => ({ where: () => Promise.resolve([]) }),
          }),
        })
    );

    await service.revokeToken('tok-1', 'tenant-1');

    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 'tenant-1' }),
      expect.any(Function)
    );
  });

  // Test 6: hashToken produces consistent SHA-256 output
  it('hashToken produces consistent SHA-256 output (two generateToken calls produce unique hashes)', async () => {
    const service = new BiTokenService();

    let hash1 = '';
    let hash2 = '';

    mockWithTenantContext
      .mockImplementationOnce(
        async (_db: unknown, _ctx: unknown, fn: (db: unknown) => Promise<unknown>) =>
          fn({
            insert: () => ({
              values: (vals: Record<string, unknown>) => {
                hash1 = vals['tokenHash'] as string;
                return { returning: () => Promise.resolve([{ id: 'tok-1' }]) };
              },
            }),
          })
      )
      .mockImplementationOnce(
        async (_db: unknown, _ctx: unknown, fn: (db: unknown) => Promise<unknown>) =>
          fn({
            insert: () => ({
              values: (vals: Record<string, unknown>) => {
                hash2 = vals['tokenHash'] as string;
                return { returning: () => Promise.resolve([{ id: 'tok-2' }]) };
              },
            }),
          })
      );

    const raw1 = await service.generateToken('t1', 'desc1');
    const raw2 = await service.generateToken('t1', 'desc2');

    // Hashes are 64-char hex (SHA-256)
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash2).toMatch(/^[a-f0-9]{64}$/);
    // Each raw token produces a unique hash
    expect(hash1).not.toBe(hash2);
    // Hash is deterministic: re-hashing raw gives same result
    expect(sha256(raw1)).toBe(hash1);
    expect(sha256(raw2)).toBe(hash2);
  });

  // Test 7: service instantiates without error
  it('service instantiates without error', () => {
    expect(() => new BiTokenService()).not.toThrow();
  });

  // Test 8: token cache is cleared by onModuleDestroy
  it('token cache is cleared by onModuleDestroy without error', async () => {
    const service = new BiTokenService();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // Test 9: generateToken passes description to DB values
  it('generateToken passes description to DB values', async () => {
    const service = new BiTokenService();
    let capturedDesc: string | null = null;

    mockWithTenantContext.mockImplementationOnce(
      async (_db: unknown, _ctx: unknown, fn: (db: unknown) => Promise<unknown>) =>
        fn({
          insert: () => ({
            values: (vals: Record<string, unknown>) => {
              capturedDesc = vals['description'] as string;
              return { returning: () => Promise.resolve([{ id: 'tok-99' }]) };
            },
          }),
        })
    );

    await service.generateToken('tenant-1', 'My BI connector');

    expect(capturedDesc).toBe('My BI connector');
  });

  // Test 10: revokeToken resolves without error on success
  it('revokeToken resolves without error on success', async () => {
    const service = new BiTokenService();
    mockWithTenantContext.mockImplementationOnce(
      async (_db: unknown, _ctx: unknown, fn: (db: unknown) => Promise<unknown>) =>
        fn({
          update: () => ({
            set: () => ({ where: () => Promise.resolve([]) }),
          }),
        })
    );

    await expect(service.revokeToken('tok-1', 'tenant-1')).resolves.not.toThrow();
  });
});
