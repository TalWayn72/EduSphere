import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AgentMessageService } from './agent-message.service';
import type { AuthContext } from '@edusphere/auth';

// ── DB mock helpers ──────────────────────────────────────────────────────────
const mockReturning = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const _mockSet = vi.fn();
const mockValues = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

const mockTx = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
};

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: vi.fn(async (_db, _ctx, callback) => callback(mockTx)),
  agentMessages: {
    id: 'id',
    sessionId: 'sessionId',
    role: 'role',
    content: 'content',
    createdAt: 'createdAt',
  },
  eq: vi.fn((col, val) => ({ col, val })),
  asc: vi.fn((col) => ({ col, dir: 'asc' })),
}));

import { withTenantContext } from '@edusphere/db';

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

const MOCK_MESSAGE = {
  id: 'msg-1',
  sessionId: 'session-1',
  role: 'USER',
  content: 'Hello world',
  metadata: {},
  createdAt: new Date('2025-01-01'),
};

describe('AgentMessageService', () => {
  let service: AgentMessageService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default select chain
    mockLimit.mockResolvedValue([MOCK_MESSAGE]);
    mockWhere.mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy });
    mockOrderBy.mockResolvedValue([MOCK_MESSAGE]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });

    // Default insert chain
    mockReturning.mockResolvedValue([MOCK_MESSAGE]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    // Default delete chain
    mockWhere.mockReturnValue({
      limit: mockLimit,
      orderBy: mockOrderBy,
      returning: mockReturning,
    });
    mockDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });

    service = new AgentMessageService();
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns message when found', async () => {
      mockLimit.mockResolvedValue([MOCK_MESSAGE]);
      const result = await service.findById('msg-1', MOCK_AUTH);
      expect(result).toEqual(MOCK_MESSAGE);
    });

    it('throws NotFoundException when message does not exist', async () => {
      mockLimit.mockResolvedValue([]);
      await expect(service.findById('nonexistent', MOCK_AUTH)).rejects.toThrow(
        NotFoundException
      );
    });

    it('throws NotFoundException when tenantId is missing', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: '' };
      await expect(service.findById('msg-1', noTenantAuth)).rejects.toThrow(
        NotFoundException
      );
    });

    it('calls withTenantContext with correct tenant info', async () => {
      mockLimit.mockResolvedValue([MOCK_MESSAGE]);
      await service.findById('msg-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        expect.any(Function)
      );
    });

    it('uses first role from roles array as userRole', async () => {
      mockLimit.mockResolvedValue([MOCK_MESSAGE]);
      await service.findById('msg-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userRole: 'STUDENT' }),
        expect.any(Function)
      );
    });
  });

  // ── findBySession ─────────────────────────────────────────────────────────

  describe('findBySession()', () => {
    it('returns messages for a session in ascending order', async () => {
      mockOrderBy.mockResolvedValue([MOCK_MESSAGE]);
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      const result = await service.findBySession('session-1', MOCK_AUTH);
      expect(Array.isArray(result)).toBe(true);
    });

    it('throws NotFoundException when tenantId is missing', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: '' };
      await expect(
        service.findBySession('session-1', noTenantAuth)
      ).rejects.toThrow(NotFoundException);
    });

    it('calls withTenantContext on every query', async () => {
      mockOrderBy.mockResolvedValue([]);
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      await service.findBySession('session-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalled();
    });

    it('orders messages by createdAt ascending', async () => {
      mockOrderBy.mockResolvedValue([]);
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      await service.findBySession('session-1', MOCK_AUTH);
      expect(mockOrderBy).toHaveBeenCalled();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a message and returns it', async () => {
      mockReturning.mockResolvedValue([MOCK_MESSAGE]);
      const input = {
        sessionId: 'session-1',
        role: 'USER' as const,
        content: 'Hello',
      };
      const result = await service.create(input, MOCK_AUTH);
      expect(result).toEqual(MOCK_MESSAGE);
    });

    it('throws NotFoundException when tenantId is missing', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: '' };
      await expect(
        service.create(
          { sessionId: 'session-1', role: 'USER' as const, content: 'Hi' },
          noTenantAuth
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when insert returns empty', async () => {
      mockReturning.mockResolvedValue([]);
      await expect(
        service.create(
          { sessionId: 'session-1', role: 'USER' as const, content: 'Hi' },
          MOCK_AUTH
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('calls withTenantContext for RLS enforcement', async () => {
      mockReturning.mockResolvedValue([MOCK_MESSAGE]);
      await service.create(
        { sessionId: 'session-1', role: 'USER' as const, content: 'Hi' },
        MOCK_AUTH
      );
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: 'tenant-1' }),
        expect.any(Function)
      );
    });

    it('creates ASSISTANT messages correctly', async () => {
      const assistantMsg = { ...MOCK_MESSAGE, role: 'ASSISTANT' };
      mockReturning.mockResolvedValue([assistantMsg]);
      const result = await service.create(
        {
          sessionId: 'session-1',
          role: 'ASSISTANT' as const,
          content: 'Hi there!',
        },
        MOCK_AUTH
      );
      expect(result.role).toBe('ASSISTANT');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('returns true when message is successfully deleted', async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });
      const result = await service.delete('msg-1', MOCK_AUTH);
      expect(result).toBe(true);
    });

    it('returns false when message does not exist (rowCount 0)', async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 0 }),
      });
      const result = await service.delete('nonexistent', MOCK_AUTH);
      expect(result).toBe(false);
    });

    it('throws NotFoundException when tenantId is missing', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: '' };
      await expect(service.delete('msg-1', noTenantAuth)).rejects.toThrow(
        NotFoundException
      );
    });

    it('calls withTenantContext for RLS enforcement on delete', async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });
      await service.delete('msg-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: 'tenant-1' }),
        expect.any(Function)
      );
    });
  });
});
