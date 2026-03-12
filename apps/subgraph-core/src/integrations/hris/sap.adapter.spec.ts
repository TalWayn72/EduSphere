/**
 * SapAdapter unit tests — Phase 52
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SapAdapter } from './sap.adapter.js';
import type { HrisConfig } from './hris-adapter.interface.js';

const config: HrisConfig = {
  type: 'SAP',
  baseUrl: 'https://api.successfactors.com',
  clientId: 'sap-client-id',
  clientSecret: 'sap-secret',
  tenantId: 'tenant-001',
};

describe('SapAdapter', () => {
  let adapter: SapAdapter;

  beforeEach(() => {
    adapter = new SapAdapter();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have type SAP', () => {
    expect(adapter.type).toBe('SAP');
  });

  it('testConnection returns true on 200 response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    const result = await adapter.testConnection(config);
    expect(result).toBe(true);
  });

  it('testConnection returns false on non-200 response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    const result = await adapter.testConnection(config);
    expect(result).toBe(false);
  });

  it('testConnection returns false on network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await adapter.testConnection(config);
    expect(result).toBe(false);
  });

  it('fetchUsers returns empty array (stub)', async () => {
    const users = await adapter.fetchUsers(config);
    expect(users).toEqual([]);
  });

  it('fetchGroups returns empty array (stub)', async () => {
    const groups = await adapter.fetchGroups(config);
    expect(groups).toEqual([]);
  });

  it('syncUsers returns stub result with SAP error message', async () => {
    const result = await adapter.syncUsers(config, 'tenant-001');
    expect(result.usersUpserted).toBe(0);
    expect(result.errors[0]).toContain('SAP');
  });
});
