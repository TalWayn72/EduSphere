/**
 * ScimGroupService unit tests (Vitest).
 * DB and NATS are mocked — no live infrastructure required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted — use inline vi.fn() only, no outer variable refs
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    scimGroups: {
      id: 'id',
      tenantId: 'tenant_id',
      displayName: 'display_name',
      memberIds: 'member_ids',
      courseIds: 'course_ids',
    },
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

import { ScimGroupService } from './scim-group.service.js';
import { withTenantContext, closeAllPools } from '@edusphere/db';
import { connect } from 'nats';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-uuid-1234';
const GROUP_ID = 'group-uuid-5678';

const makeDbGroup = (overrides: Record<string, unknown> = {}) => ({
  id: GROUP_ID,
  tenantId: TENANT_ID,
  externalId: 'ext-001',
  displayName: 'Engineering',
  memberIds: ['user-1', 'user-2'],
  courseIds: ['course-a'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ScimGroupService', () => {
  let service: ScimGroupService;
  let mockNats: { drain: ReturnType<typeof vi.fn>; publish: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockNats = {
      drain: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn(),
    };
    vi.mocked(connect).mockResolvedValue(
      mockNats as Parameters<typeof connect>[0] extends infer _T ? unknown : never
    );

    service = new ScimGroupService();
    await service.onModuleInit();
    Object.assign(service, { db: {}, nats: mockNats });
  });

  // ─── listGroups ─────────────────────────────────────────────────────────────

  describe('listGroups', () => {
    it('returns paginated groups and total count', async () => {
      const dbRow = makeDbGroup();
      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) =>
        fn({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => ({ offset: () => [dbRow] }),
              }),
            }),
          }),
          execute: vi.fn().mockResolvedValue({ rows: [{ count: '1' }] }),
        } as never)
      );

      const result = await service.listGroups(TENANT_ID, 1, 10);

      expect(result.total).toBe(1);
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0]!.displayName).toBe('Engineering');
      expect(result.groups[0]!.id).toBe(GROUP_ID);
    });

    it('returns empty list when no groups exist', async () => {
      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) =>
        fn({
          select: () => ({
            from: () => ({
              where: () => ({ limit: () => ({ offset: () => [] }) }),
            }),
          }),
          execute: vi.fn().mockResolvedValue({ rows: [{ count: '0' }] }),
        } as never)
      );

      const result = await service.listGroups(TENANT_ID, 1, 10);

      expect(result.total).toBe(0);
      expect(result.groups).toHaveLength(0);
    });
  });

  // ─── createGroup ────────────────────────────────────────────────────────────

  describe('createGroup', () => {
    it('persists group and returns SCIM format', async () => {
      const dbRow = makeDbGroup();
      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) =>
        fn({
          insert: () => ({
            values: () => ({ returning: () => [dbRow] }),
          }),
        } as never)
      );

      const result = await service.createGroup(TENANT_ID, {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'Engineering',
        members: [{ value: 'user-1' }, { value: 'user-2' }],
        'urn:edusphere:scim:extension': { courseIds: ['course-a'] },
      });

      expect(result.schemas).toEqual(['urn:ietf:params:scim:schemas:core:2.0:Group']);
      expect(result.displayName).toBe('Engineering');
      expect(result.members).toHaveLength(2);
      expect(result['urn:edusphere:scim:extension']?.courseIds).toEqual(['course-a']);
    });

    it('emits NATS enrollment event when courseIds + members present', async () => {
      const dbRow = makeDbGroup();
      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) =>
        fn({
          insert: () => ({
            values: () => ({ returning: () => [dbRow] }),
          }),
        } as never)
      );

      await service.createGroup(TENANT_ID, {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'Engineering',
        members: [{ value: 'user-1' }],
        'urn:edusphere:scim:extension': { courseIds: ['course-a'] },
      });

      expect(mockNats.publish).toHaveBeenCalledWith(
        'EDUSPHERE.scim.group.enrollment',
        expect.any(Uint8Array)
      );
    });

    it('throws when DB insert returns nothing', async () => {
      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) =>
        fn({
          insert: () => ({
            values: () => ({ returning: () => [] }),
          }),
        } as never)
      );

      await expect(
        service.createGroup(TENANT_ID, {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'Fail Group',
        })
      ).rejects.toThrow('Failed to create SCIM group');
    });
  });

  // ─── getGroup ───────────────────────────────────────────────────────────────

  describe('getGroup', () => {
    it('returns group when found', async () => {
      const dbRow = makeDbGroup();
      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) =>
        fn({
          select: () => ({
            from: () => ({
              where: () => ({ limit: () => [dbRow] }),
            }),
          }),
        } as never)
      );

      const result = await service.getGroup(TENANT_ID, GROUP_ID);
      expect(result.id).toBe(GROUP_ID);
      expect(result.displayName).toBe('Engineering');
    });

    it('throws NotFoundException for unknown id', async () => {
      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) =>
        fn({
          select: () => ({
            from: () => ({
              where: () => ({ limit: () => [] }),
            }),
          }),
        } as never)
      );

      await expect(
        service.getGroup(TENANT_ID, 'non-existent-id')
      ).rejects.toThrow('not found');
    });
  });

  // ─── patchGroup ─────────────────────────────────────────────────────────────

  describe('patchGroup', () => {
    it('add-member operation appends new member without duplicates', async () => {
      const dbRow = makeDbGroup({ memberIds: ['user-1'] });
      let callCount = 0;

      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) => {
        callCount++;
        if (callCount === 1) {
          // getGroup call
          return fn({
            select: () => ({
              from: () => ({ where: () => ({ limit: () => [dbRow] }) }),
            }),
          } as never);
        }
        // update call — return updated row with new member
        const updatedRow = makeDbGroup({ memberIds: ['user-1', 'user-new'] });
        return fn({
          update: () => ({
            set: () => ({
              where: () => ({ returning: () => [updatedRow] }),
            }),
          }),
        } as never);
      });

      const result = await service.patchGroup(TENANT_ID, GROUP_ID, [
        { op: 'add', path: 'members', value: [{ value: 'user-new' }] },
      ]);

      expect(result.members).toHaveLength(2);
    });

    it('remove-member operation removes specified member', async () => {
      const dbRow = makeDbGroup({ memberIds: ['user-1', 'user-2'] });
      let callCount = 0;

      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) => {
        callCount++;
        if (callCount === 1) {
          return fn({
            select: () => ({
              from: () => ({ where: () => ({ limit: () => [dbRow] }) }),
            }),
          } as never);
        }
        const updatedRow = makeDbGroup({ memberIds: ['user-2'] });
        return fn({
          update: () => ({
            set: () => ({
              where: () => ({ returning: () => [updatedRow] }),
            }),
          }),
        } as never);
      });

      const result = await service.patchGroup(TENANT_ID, GROUP_ID, [
        { op: 'remove', path: 'members', value: [{ value: 'user-1' }] },
      ]);

      expect(result.members).toHaveLength(1);
      expect(result.members?.[0]?.value).toBe('user-2');
    });

    it('replace displayName updates the group name', async () => {
      const dbRow = makeDbGroup({ displayName: 'Old Name' });
      let callCount = 0;

      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) => {
        callCount++;
        if (callCount === 1) {
          return fn({
            select: () => ({
              from: () => ({ where: () => ({ limit: () => [dbRow] }) }),
            }),
          } as never);
        }
        const updatedRow = makeDbGroup({ displayName: 'New Name' });
        return fn({
          update: () => ({
            set: () => ({
              where: () => ({ returning: () => [updatedRow] }),
            }),
          }),
        } as never);
      });

      const result = await service.patchGroup(TENANT_ID, GROUP_ID, [
        { op: 'replace', path: 'displayName', value: 'New Name' },
      ]);

      expect(result.displayName).toBe('New Name');
    });
  });

  // ─── deleteGroup ────────────────────────────────────────────────────────────

  describe('deleteGroup', () => {
    it('deletes group successfully without error', async () => {
      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) =>
        fn({
          delete: () => ({
            where: () => ({ returning: () => [{ id: GROUP_ID }] }),
          }),
        } as never)
      );

      await expect(
        service.deleteGroup(TENANT_ID, GROUP_ID)
      ).resolves.toBeUndefined();
    });

    it('publishes NATS deleted event on successful delete', async () => {
      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) =>
        fn({
          delete: () => ({
            where: () => ({ returning: () => [{ id: GROUP_ID }] }),
          }),
        } as never)
      );

      await service.deleteGroup(TENANT_ID, GROUP_ID);

      expect(mockNats.publish).toHaveBeenCalledWith(
        'EDUSPHERE.scim.group.deleted',
        expect.any(Uint8Array)
      );
    });

    it('throws NotFoundException for unknown id', async () => {
      vi.mocked(withTenantContext).mockImplementation(async (_db, _ctx, fn) =>
        fn({
          delete: () => ({
            where: () => ({ returning: () => [] }),
          }),
        } as never)
      );

      await expect(
        service.deleteGroup(TENANT_ID, 'non-existent-id')
      ).rejects.toThrow('not found');
    });
  });

  // ─── Memory-safety ──────────────────────────────────────────────────────────

  describe('onModuleDestroy', () => {
    it('drains NATS connection and calls closeAllPools', async () => {
      await service.onModuleDestroy();
      expect(mockNats.drain).toHaveBeenCalledTimes(1);
      expect(closeAllPools).toHaveBeenCalled();
    });

    it('sets nats to null after drain preventing double-drain', async () => {
      await service.onModuleDestroy();
      const privateNats = (service as unknown as Record<string, unknown>)['nats'];
      expect(privateNats).toBeNull();
    });
  });
});
