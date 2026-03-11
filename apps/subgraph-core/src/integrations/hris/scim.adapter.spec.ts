/**
 * ScimAdapter unit tests — Phase 52
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScimAdapter } from './scim.adapter.js';
import type { HrisConfig } from './hris-adapter.interface.js';

const config: HrisConfig = {
  type: 'SCIM',
  baseUrl: 'https://scim.example.com',
  clientSecret: 'test-bearer-token',
  tenantId: 'tenant-001',
};

describe('ScimAdapter', () => {
  let adapter: ScimAdapter;

  beforeEach(() => {
    adapter = new ScimAdapter();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have type SCIM', () => {
    expect(adapter.type).toBe('SCIM');
  });

  it('testConnection returns true when service provider config responds with 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 200,
      ok: true,
    } as Response);

    const result = await adapter.testConnection(config);
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://scim.example.com/ServiceProviderConfig',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-bearer-token' }),
      })
    );
  });

  it('testConnection returns false on non-200 response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 401,
      ok: false,
    } as Response);

    const result = await adapter.testConnection(config);
    expect(result).toBe(false);
  });

  it('testConnection returns false on network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const result = await adapter.testConnection(config);
    expect(result).toBe(false);
  });

  it('fetchUsers returns empty array on empty SCIM response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ totalResults: 0, Resources: [] }),
    } as Response);

    const users = await adapter.fetchUsers(config);
    expect(users).toEqual([]);
  });

  it('fetchUsers maps SCIM user resources to HrisUser', async () => {
    const scimUser = {
      id: 'scim-id-1',
      externalId: 'ext-1',
      active: true,
      emails: [{ value: 'john@example.com', primary: true }],
      name: { givenName: 'John', familyName: 'Doe' },
      title: 'Engineer',
      'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
        department: 'Engineering',
        manager: { value: 'mgr-1' },
      },
    };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ totalResults: 1, Resources: [scimUser] }),
    } as Response);

    const users = await adapter.fetchUsers(config);
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      externalId: 'ext-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      department: 'Engineering',
      jobTitle: 'Engineer',
      managerId: 'mgr-1',
      isActive: true,
    });
  });

  it('fetchGroups returns empty array on empty response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ totalResults: 0, Resources: [] }),
    } as Response);

    const groups = await adapter.fetchGroups(config);
    expect(groups).toEqual([]);
  });

  it('fetchGroups maps SCIM group resources to HrisGroup', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          totalResults: 1,
          Resources: [
            {
              id: 'grp-1',
              displayName: 'Engineering',
              members: [{ value: 'user-1' }, { value: 'user-2' }],
            },
          ],
        }),
    } as Response);

    const groups = await adapter.fetchGroups(config);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      externalId: 'grp-1',
      name: 'Engineering',
      memberIds: ['user-1', 'user-2'],
    });
  });

  it('syncUsers returns upsert count from fetchUsers', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          totalResults: 3,
          Resources: [
            { id: '1', active: true, emails: [{ value: 'a@b.com' }], name: {} },
            { id: '2', active: true, emails: [{ value: 'c@d.com' }], name: {} },
            { id: '3', active: true, emails: [{ value: 'e@f.com' }], name: {} },
          ],
        }),
    } as Response);

    const result = await adapter.syncUsers(config, 'tenant-001');
    expect(result.usersUpserted).toBe(3);
    expect(result.errors).toHaveLength(0);
  });
});
