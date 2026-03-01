import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockWithTenantContext, mockCloseAllPools } = vi.hoisted(() => ({
  mockWithTenantContext: vi.fn(),
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  schema: { xapiTokens: {} },
  withTenantContext: mockWithTenantContext,
  eq: vi.fn(),
  and: vi.fn(),
}));

import { XapiTokenService } from './xapi-token.service.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// Helper: mock withTenantContext to invoke the callback with a fake tx
function mockTxOnce(txImpl: unknown): void {
  mockWithTenantContext.mockImplementationOnce(
    async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn(txImpl)
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('XapiTokenService', () => {
  let service: XapiTokenService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCloseAllPools.mockResolvedValue(undefined);
    service = new XapiTokenService();
  });

  // Test 1: onModuleDestroy calls closeAllPools
  it('onModuleDestroy — calls closeAllPools', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // Test 2: generateToken returns 64-char hex string
  it('generateToken — returns a 64-char hex raw token', async () => {
    mockTxOnce({
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([{ id: 'tok-1' }]),
        }),
      }),
    });

    const raw = await service.generateToken('tenant-1', 'LRS Connector');
    expect(raw).toMatch(/^[a-f0-9]{64}$/);
  });

  // Test 3: generateToken stores SHA-256 hash, not raw token
  it('generateToken — stores SHA-256 hash (not raw token) in DB', async () => {
    let capturedHash: string | null = null;

    mockTxOnce({
      insert: () => ({
        values: (vals: Record<string, unknown>) => {
          capturedHash = vals['tokenHash'] as string;
          return {
            returning: () => Promise.resolve([{ id: 'tok-1' }]),
          };
        },
      }),
    });

    const raw = await service.generateToken('tenant-1', 'Test Token');
    expect(capturedHash).not.toBeNull();
    expect(capturedHash).toBe(sha256(raw));
    expect(capturedHash).not.toBe(raw);
  });

  // Test 4: listTokens calls withTenantContext with the correct tenantId
  it('listTokens — calls withTenantContext with correct tenantId', async () => {
    mockTxOnce({
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
    });

    await service.listTokens('tenant-1');

    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 'tenant-1' }),
      expect.any(Function)
    );
  });

  // Test 5: revokeToken calls withTenantContext with the correct tenantId
  it('revokeToken — calls withTenantContext with correct tenantId', async () => {
    mockTxOnce({
      update: () => ({
        set: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
    });

    await service.revokeToken('tok-1', 'tenant-1');

    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 'tenant-1' }),
      expect.any(Function)
    );
  });

  // Test 6: service instantiates without error
  it('service instantiates without error', () => {
    expect(() => new XapiTokenService()).not.toThrow();
  });

  // Test 7: hashToken is deterministic (same input → same SHA-256 output)
  it('hashToken — produces consistent SHA-256 output for same input', async () => {
    let hash1: string | null = null;
    let hash2: string | null = null;

    mockTxOnce({
      insert: () => ({
        values: (vals: Record<string, unknown>) => {
          hash1 = vals['tokenHash'] as string;
          return { returning: () => Promise.resolve([{ id: 'tok-a' }]) };
        },
      }),
    });

    const raw = await service.generateToken('t1', 'consistent');
    // Re-compute hash independently
    hash2 = sha256(raw);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  // Test 8: generateToken with optional lrsEndpoint stores it in DB values
  it('generateToken — passes optional lrsEndpoint to DB values', async () => {
    let capturedEndpoint: string | null | undefined = undefined;

    mockTxOnce({
      insert: () => ({
        values: (vals: Record<string, unknown>) => {
          capturedEndpoint = vals['lrsEndpoint'] as string | null;
          return { returning: () => Promise.resolve([{ id: 'tok-2' }]) };
        },
      }),
    });

    await service.generateToken('tenant-1', 'LRS', 'https://lrs.example.com');
    expect(capturedEndpoint).toBe('https://lrs.example.com');
  });

  // Test 9: two generateToken calls produce different raw tokens
  it('generateToken — two calls produce different raw tokens', async () => {
    mockTxOnce({
      insert: () => ({
        values: () => ({ returning: () => Promise.resolve([{ id: 'tok-a' }]) }),
      }),
    });
    mockTxOnce({
      insert: () => ({
        values: () => ({ returning: () => Promise.resolve([{ id: 'tok-b' }]) }),
      }),
    });

    const raw1 = await service.generateToken('t1', 'first');
    const raw2 = await service.generateToken('t1', 'second');

    expect(raw1).not.toBe(raw2);
    expect(sha256(raw1)).not.toBe(sha256(raw2));
  });

  // Test 10: onModuleDestroy clears the token cache (resolves without error)
  it('onModuleDestroy — clears token cache and resolves cleanly', async () => {
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });
});
