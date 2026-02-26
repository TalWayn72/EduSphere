import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AgentSessionService } from './agent-session.service';
import type { AuthContext } from '@edusphere/auth';

// ── DB mock helpers ──────────────────────────────────────────────────────────
const mockReturning = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockSet = vi.fn();
const mockValues = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

const mockTx = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: vi.fn(async (_db, _ctx, callback) => callback(mockTx)),
  agentSessions: {
    id: 'id',
    userId: 'userId',
    status: 'status',
    createdAt: 'createdAt',
    completedAt: 'completedAt',
    agentType: 'agentType',
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => ({ and: args })),
  desc: vi.fn((col) => ({ col, dir: 'desc' })),
}));

import { withTenantContext } from '@edusphere/db';

// ── NatsService mock ──────────────────────────────────────────────────────────
const mockNatsService = {
  publish: vi.fn().mockResolvedValue(undefined),
};

// ── Fixtures ──────────────────────────────────────────────────────────────────
const MOCK_AUTH: AuthContext = {
  userId: 'user-1',
  email: 'student@example.com',
  username: 'student',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
  isSuperAdmin: false,
};

const MOCK_SESSION = {
  id: 'session-1',
  userId: 'user-1',
  agentType: 'TUTOR',
  status: 'ACTIVE',
  metadata: {},
  createdAt: new Date('2025-01-01'),
  completedAt: null,
};

describe('AgentSessionService', () => {
  let service: AgentSessionService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default chain: select → from → where → limit → [MOCK_SESSION]
    // AgentSessionService uses:
    //   findById:        where().limit()
    //   findByUser:      where().orderBy().limit()
    //   findActiveByUser: where().orderBy()
    mockLimit.mockResolvedValue([MOCK_SESSION]);
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });

    // Default insert chain
    mockReturning.mockResolvedValue([MOCK_SESSION]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    // Default update chain
    mockSet.mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: mockReturning }),
    });
    mockUpdate.mockReturnValue({ set: mockSet });

    service = new AgentSessionService(mockNatsService as any);
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns session when found', async () => {
      mockLimit.mockResolvedValue([MOCK_SESSION]);
      const result = await service.findById('session-1', MOCK_AUTH);
      expect(result).toEqual(MOCK_SESSION);
    });

    it('throws NotFoundException when session does not exist', async () => {
      mockLimit.mockResolvedValue([]);
      await expect(service.findById('nonexistent', MOCK_AUTH)).rejects.toThrow(
        NotFoundException
      );
    });

    it('throws NotFoundException when tenantId is missing', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: '' };
      await expect(service.findById('session-1', noTenantAuth)).rejects.toThrow(
        NotFoundException
      );
    });

    it('calls withTenantContext with correct tenant info', async () => {
      mockLimit.mockResolvedValue([MOCK_SESSION]);
      await service.findById('session-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        expect.any(Function)
      );
    });

    it('uses first role from roles array as userRole', async () => {
      mockLimit.mockResolvedValue([MOCK_SESSION]);
      await service.findById('session-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userRole: 'STUDENT' }),
        expect.any(Function)
      );
    });
  });

  // ── findByUser ────────────────────────────────────────────────────────────

  describe('findByUser()', () => {
    it('returns sessions for user', async () => {
      // findByUser: where().orderBy().limit(20)
      const limitFn = vi.fn().mockResolvedValue([MOCK_SESSION]);
      const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
      mockWhere.mockReturnValue({ orderBy: orderByFn });
      const result = await service.findByUser('user-1', MOCK_AUTH);
      expect(Array.isArray(result)).toBe(true);
    });

    it('throws NotFoundException when tenantId is missing', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: '' };
      await expect(service.findByUser('user-1', noTenantAuth)).rejects.toThrow(
        NotFoundException
      );
    });

    it('calls withTenantContext on every query', async () => {
      const limitFn = vi.fn().mockResolvedValue([]);
      const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
      mockWhere.mockReturnValue({ orderBy: orderByFn });
      await service.findByUser('user-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalled();
    });
  });

  // ── findActiveByUser ──────────────────────────────────────────────────────

  describe('findActiveByUser()', () => {
    it('returns only ACTIVE sessions for user', async () => {
      // findActiveByUser: where().orderBy() (no limit call)
      const orderByFn = vi.fn().mockResolvedValue([MOCK_SESSION]);
      mockWhere.mockReturnValue({ orderBy: orderByFn });
      const result = await service.findActiveByUser('user-1', MOCK_AUTH);
      expect(Array.isArray(result)).toBe(true);
    });

    it('throws NotFoundException when tenantId is missing', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: '' };
      await expect(
        service.findActiveByUser('user-1', noTenantAuth)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a session and returns it', async () => {
      mockReturning.mockResolvedValue([MOCK_SESSION]);
      const input = { userId: 'user-1', agentType: 'TUTOR', metadata: {} };
      const result = await service.create(input, MOCK_AUTH);
      expect(result).toEqual(MOCK_SESSION);
    });

    it('throws NotFoundException when tenantId is missing', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: '' };
      await expect(
        service.create({ userId: 'user-1', agentType: 'TUTOR' }, noTenantAuth)
      ).rejects.toThrow(NotFoundException);
    });

    it('publishes session.created event to NATS after creation', async () => {
      mockReturning.mockResolvedValue([MOCK_SESSION]);
      await service.create({ userId: 'user-1', agentType: 'TUTOR' }, MOCK_AUTH);
      expect(mockNatsService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session.created',
          sessionId: 'session-1',
        })
      );
    });

    it('includes tenantId in NATS event', async () => {
      mockReturning.mockResolvedValue([MOCK_SESSION]);
      await service.create({ userId: 'user-1', agentType: 'TUTOR' }, MOCK_AUTH);
      expect(mockNatsService.publish).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1' })
      );
    });

    it('includes userId in NATS event', async () => {
      mockReturning.mockResolvedValue([MOCK_SESSION]);
      await service.create({ userId: 'user-1', agentType: 'TUTOR' }, MOCK_AUTH);
      expect(mockNatsService.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' })
      );
    });

    it('calls withTenantContext for RLS enforcement', async () => {
      mockReturning.mockResolvedValue([MOCK_SESSION]);
      await service.create({ userId: 'user-1', agentType: 'TUTOR' }, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: 'tenant-1' }),
        expect.any(Function)
      );
    });
  });

  // ── complete ──────────────────────────────────────────────────────────────

  describe('complete()', () => {
    it('sets status to COMPLETED', async () => {
      const completed = { ...MOCK_SESSION, status: 'COMPLETED' };
      mockReturning.mockResolvedValue([completed]);
      const result = await service.complete('session-1', MOCK_AUTH);
      expect(result.status).toBe('COMPLETED');
    });

    it('publishes session.completed event to NATS', async () => {
      const completed = { ...MOCK_SESSION, status: 'COMPLETED' };
      mockReturning.mockResolvedValue([completed]);
      await service.complete('session-1', MOCK_AUTH);
      expect(mockNatsService.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'session.completed' })
      );
    });
  });

  // ── cancel ────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('sets status to CANCELLED', async () => {
      const cancelled = { ...MOCK_SESSION, status: 'CANCELLED' };
      mockReturning.mockResolvedValue([cancelled]);
      const result = await service.cancel('session-1', MOCK_AUTH);
      expect(result.status).toBe('CANCELLED');
    });

    it('does not publish NATS event on cancel', async () => {
      const cancelled = { ...MOCK_SESSION, status: 'CANCELLED' };
      mockReturning.mockResolvedValue([cancelled]);
      await service.cancel('session-1', MOCK_AUTH);
      // cancel() calls update() only, no NATS publish
      expect(mockNatsService.publish).not.toHaveBeenCalled();
    });
  });
});
