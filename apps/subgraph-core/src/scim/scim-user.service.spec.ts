import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted - use inline vi.fn() only, no outer variable refs
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    users: { id: 'id', tenantId: 'tenant_id', email: 'email' },
    scimSyncLog: {},
  },
  withTenantContext: vi.fn(),
  eq: vi.fn((a, b) => ({ a, b })),
  and: vi.fn((...args) => args),
  sql: vi.fn(() => ({})),
}));
vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    drain: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn(),
  }),
}));
vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
}));

import { ScimUserService } from './scim-user.service.js';
import type { ScimUser, ScimPatchOp } from './scim.types.js';
import { withTenantContext } from '@edusphere/db';
import { connect } from 'nats';

const MOCK_USER_ROW = {
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  role: 'STUDENT',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_SCIM_USER: ScimUser = {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
  userName: 'alice@example.com',
  name: { givenName: 'Alice', familyName: 'Smith' },
  emails: [{ value: 'alice@example.com', primary: true }],
};

describe('ScimUserService', () => {
  let service: ScimUserService;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockValues: ReturnType<typeof vi.fn>;
  let mockReturning: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockWhere: ReturnType<typeof vi.fn>;
  let mockNats: {
    drain: ReturnType<typeof vi.fn>;
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockReturning = vi.fn().mockResolvedValue([MOCK_USER_ROW]);
    mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    mockInsert = vi.fn().mockReturnValue({ values: mockValues });
    mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

    const withTenantContextMock = vi.mocked(withTenantContext);
    withTenantContextMock.mockImplementation(async (_db, _ctx, fn) =>
      fn({
        insert: mockInsert,
        update: mockUpdate,
        select: () => ({
          from: () => ({
            where: () => ({ limit: () => Promise.resolve([MOCK_USER_ROW]) }),
          }),
        }),
        execute: vi.fn().mockResolvedValue({ rows: [{ count: '5' }] }),
      })
    );

    mockNats = {
      drain: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn(),
    };
    vi.mocked(connect).mockResolvedValue(
      mockNats as Parameters<typeof connect>[0] extends infer _T
        ? unknown
        : never
    );

    service = new ScimUserService();
    await service.onModuleInit();
    Object.assign(service, { db: {}, nats: mockNats });
  });

  it('createUser stores user and logs to scim_sync_log', async () => {
    const result = await service.createUser('tenant-1', MOCK_SCIM_USER);
    expect(result.id).toBe('user-1');
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('deleteUser soft-deletes and publishes NATS deprovisioned event', async () => {
    await service.deleteUser('tenant-1', 'user-1');
    expect(mockNats.publish).toHaveBeenCalledWith(
      'EDUSPHERE.user.deprovisioned',
      expect.any(Uint8Array)
    );
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('patchUser with op=replace updates the specified field', async () => {
    const ops: ScimPatchOp[] = [
      { op: 'replace', path: 'name.givenName', value: 'Bob' },
    ];
    const result = await service.patchUser('tenant-1', 'user-1', ops);
    expect(mockUpdate).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('patchUser with op=add handles add operation (same path as replace)', async () => {
    const ops: ScimPatchOp[] = [
      { op: 'add', path: 'name.familyName', value: 'Johnson' },
    ];
    await service.patchUser('tenant-1', 'user-1', ops);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('listUsers respects startIndex pagination', async () => {
    const withCtxMock = vi.mocked(withTenantContext);
    withCtxMock.mockImplementationOnce(async (_db, _ctx, fn) =>
      fn({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => ({
                offset: vi.fn().mockResolvedValue([MOCK_USER_ROW]),
              }),
            }),
          }),
        }),
        execute: vi.fn().mockResolvedValue({ rows: [{ count: '10' }] }),
        insert: mockInsert,
      })
    );
    const { users, total } = await service.listUsers('tenant-1', 3, 10);
    expect(users).toHaveLength(1);
    expect(total).toBe(10);
  });

  it('createUser with group courseIds triggers SCIM enrollment NATS event', async () => {
    const userWithExt: ScimUser = {
      ...MOCK_SCIM_USER,
      'urn:edusphere:scim:extension': { courseIds: ['course-1', 'course-2'] },
    };
    await service.createUser('tenant-1', userWithExt);
    expect(mockNats.publish).toHaveBeenCalledWith(
      'EDUSPHERE.user.created',
      expect.any(Uint8Array)
    );
    expect(mockNats.publish).toHaveBeenCalledWith(
      'EDUSPHERE.scim.enrollment',
      expect.any(Uint8Array)
    );
  });
});
