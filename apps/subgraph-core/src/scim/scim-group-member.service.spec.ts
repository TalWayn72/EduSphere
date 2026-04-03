/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks use any for partial service stubs */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTx } = vi.hoisted(() => {
  const mockTx = {
    update: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
  };
  return { mockTx };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  schema: {
    scimGroups: {
      id: 'id',
      tenantId: 'tenant_id',
      displayName: 'display_name',
      memberIds: 'member_ids',
      courseIds: 'course_ids',
      updatedAt: 'updated_at',
    },
  },
  withTenantContext: vi.fn(
    async (_d: unknown, _c: unknown, fn: (t: unknown) => unknown) => fn(mockTx)
  ),
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
}));

import { ScimGroupMemberService } from './scim-group-member.service';
import type { ScimPatchOp } from './scim.types';

describe('ScimGroupMemberService', () => {
  let service: ScimGroupMemberService;
  const mockGroupService = {
    getGroup: vi.fn(),
    toScimGroup: vi.fn((row: any) => ({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: row.id,
      displayName: row.displayName ?? row.display_name,
      members: (row.memberIds ?? []).map((v: string) => ({ value: v })),
    })),
    publishEvent: vi.fn(),
  };

  const baseGroup = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'] as any,
    id: 'g1',
    displayName: 'Engineering',
    members: [{ value: 'u1' }, { value: 'u2' }],
    'urn:edusphere:scim:extension': { courseIds: ['c1'] },
  };

  const setupUpdate = (returnRow: any) => {
    mockTx.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([returnRow]),
        }),
      }),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGroupService.getGroup.mockResolvedValue(baseGroup);
    service = new ScimGroupMemberService(mockGroupService as any);
  });

  describe('patchGroup', () => {
    it('replaces displayName when op is replace', async () => {
      setupUpdate({
        id: 'g1',
        display_name: 'Design',
        memberIds: ['u1', 'u2'],
      });
      const ops: ScimPatchOp[] = [
        { op: 'replace', path: 'displayName', value: 'Design' },
      ];
      await service.patchGroup('tenant-1', 'g1', ops);
      expect(mockTx.update).toHaveBeenCalled();
      expect(mockGroupService.toScimGroup).toHaveBeenCalled();
    });

    it('adds members with deduplication', async () => {
      setupUpdate({
        id: 'g1',
        display_name: 'Engineering',
        memberIds: ['u1', 'u2', 'u3'],
      });
      const ops: ScimPatchOp[] = [
        {
          op: 'add',
          path: 'members',
          value: [{ value: 'u2' }, { value: 'u3' }],
        },
      ];
      await service.patchGroup('tenant-1', 'g1', ops);
      expect(mockGroupService.publishEvent).toHaveBeenCalledWith(
        'EDUSPHERE.scim.group.enrollment',
        expect.objectContaining({
          groupId: 'g1',
          memberIds: ['u2', 'u3'],
          courseIds: ['c1'],
        })
      );
    });

    it('removes specific members', async () => {
      setupUpdate({ id: 'g1', display_name: 'Engineering', memberIds: ['u1'] });
      const ops: ScimPatchOp[] = [
        { op: 'remove', path: 'members', value: [{ value: 'u2' }] },
      ];
      await service.patchGroup('tenant-1', 'g1', ops);
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('removes all members when value is empty', async () => {
      setupUpdate({ id: 'g1', display_name: 'Engineering', memberIds: [] });
      const ops: ScimPatchOp[] = [{ op: 'remove', path: 'members' }];
      await service.patchGroup('tenant-1', 'g1', ops);
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('replaces all members', async () => {
      setupUpdate({ id: 'g1', display_name: 'Engineering', memberIds: ['u5'] });
      const ops: ScimPatchOp[] = [
        { op: 'replace', path: 'members', value: [{ value: 'u5' }] },
      ];
      await service.patchGroup('tenant-1', 'g1', ops);
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('throws NotFoundException when group not found after update', async () => {
      mockTx.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      const ops: ScimPatchOp[] = [
        { op: 'replace', path: 'displayName', value: 'Gone' },
      ];
      await expect(
        service.patchGroup('tenant-1', 'nonexistent', ops)
      ).rejects.toThrow('not found');
    });

    it('does not publish enrollment event when no courseIds', async () => {
      mockGroupService.getGroup.mockResolvedValue({
        ...baseGroup,
        'urn:edusphere:scim:extension': { courseIds: [] },
      });
      setupUpdate({
        id: 'g1',
        display_name: 'Engineering',
        memberIds: ['u1', 'u2', 'u3'],
      });
      const ops: ScimPatchOp[] = [
        { op: 'add', path: 'members', value: [{ value: 'u3' }] },
      ];
      await service.patchGroup('tenant-1', 'g1', ops);
      expect(mockGroupService.publishEvent).not.toHaveBeenCalled();
    });
  });
});
