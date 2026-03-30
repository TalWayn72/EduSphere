import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb, mockNatsConn } = vi.hoisted(() => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  const mockNatsConn = {
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
    isClosed: vi.fn().mockReturnValue(false),
  };
  return { mockDb, mockNatsConn };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    pilotRequests: {
      id: 'id', status: 'status', orgName: 'org_name',
      contactEmail: 'contact_email', tenantId: 'tenant_id',
      created_at: 'created_at',
    },
    tenants: { id: 'id', name: 'name', slug: 'slug', plan: 'plan' },
    subscriptionPlans: { id: 'id', isActive: 'is_active' },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
}));

vi.mock('nats', () => ({ connect: vi.fn().mockResolvedValue(mockNatsConn) }));
vi.mock('@edusphere/nats-client', () => ({ buildNatsOptions: vi.fn(() => ({})) }));

import { PilotApprovalService } from './pilot-approval.service';
import type { TenantContext } from '@edusphere/db';

describe('PilotApprovalService', () => {
  let service: PilotApprovalService;
  const mockSubService = {
    createPilotSubscription: vi.fn().mockResolvedValue(undefined),
  };
  const superCtx: TenantContext = {
    tenantId: 'platform',
    userId: 'admin-1',
    userRole: 'SUPER_ADMIN',
  };

  const setupSelectChain = (rows: unknown[]) => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(rows),
          orderBy: vi.fn().mockResolvedValue(rows),
        }),
        orderBy: vi.fn().mockResolvedValue(rows),
      }),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PilotApprovalService(mockSubService as any);
  });

  describe('approvePilotRequest', () => {
    it('throws UnauthorizedException if role is not SUPER_ADMIN', async () => {
      const ctx = { ...superCtx, userRole: 'STUDENT' };
      await expect(
        service.approvePilotRequest('req-1', 'admin-1', ctx)
      ).rejects.toThrow('Only SUPER_ADMIN can approve');
    });

    it('throws NotFoundException if request does not exist', async () => {
      setupSelectChain([]);
      await expect(
        service.approvePilotRequest('req-1', 'admin-1', superCtx)
      ).rejects.toThrow('not found');
    });

    it('throws BadRequestException if request is not pending', async () => {
      setupSelectChain([{ id: 'req-1', status: 'approved', orgName: 'Acme' }]);
      await expect(
        service.approvePilotRequest('req-1', 'admin-1', superCtx)
      ).rejects.toThrow('already approved');
    });

    it('throws BadRequestException on self-approval', async () => {
      const selfCtx = { tenantId: 'same-tenant', userId: 'admin-1', userRole: 'SUPER_ADMIN' };
      setupSelectChain([
        { id: 'req-1', status: 'pending', orgName: 'Acme', tenantId: 'same-tenant' },
      ]);
      await expect(
        service.approvePilotRequest('req-1', 'admin-1', selfCtx)
      ).rejects.toThrow('Self-approval');
    });

    it('provisions tenant on valid approval', async () => {
      // First select: find pilot request
      let selectCalls = 0;
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(async () => {
              selectCalls++;
              if (selectCalls === 1) {
                return [{ id: 'req-1', status: 'pending', orgName: 'Acme Corp', contactEmail: 'a@b.com' }];
              }
              return [{ id: 'plan-1', isActive: true }];
            }),
          }),
        }),
      }));
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'tenant-new', name: 'Acme Corp' }]),
        }),
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await service.approvePilotRequest('req-1', 'admin-1', superCtx);
      expect(mockSubService.createPilotSubscription).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('rejectPilotRequest', () => {
    it('throws UnauthorizedException if role is not SUPER_ADMIN', async () => {
      const ctx = { ...superCtx, userRole: 'INSTRUCTOR' };
      await expect(
        service.rejectPilotRequest('req-1', 'reason', ctx)
      ).rejects.toThrow('Only SUPER_ADMIN can reject');
    });

    it('throws BadRequestException for invalid requestId format', async () => {
      await expect(
        service.rejectPilotRequest('not-a-uuid', undefined, superCtx)
      ).rejects.toThrow();
    });

    it('throws NotFoundException if request does not exist', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      setupSelectChain([]);
      await expect(
        service.rejectPilotRequest(validId, undefined, superCtx)
      ).rejects.toThrow('not found');
    });

    it('rejects a pending request successfully', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: validId, status: 'pending' }]),
          }),
        }),
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await service.rejectPilotRequest(validId, 'Not a fit', superCtx);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('listPilotRequests', () => {
    it('lists all requests when no status filter', async () => {
      setupSelectChain([{ id: 'r1' }, { id: 'r2' }]);
      const result = await service.listPilotRequests();
      expect(result).toHaveLength(2);
    });

    it('filters by status when provided', async () => {
      setupSelectChain([{ id: 'r1', status: 'pending' }]);
      const result = await service.listPilotRequests('pending');
      expect(result).toHaveLength(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('drains NATS and closes pools on destroy', async () => {
      await service.onModuleDestroy();
      expect(mockNatsConn.drain).toHaveBeenCalled();
    });
  });
});
