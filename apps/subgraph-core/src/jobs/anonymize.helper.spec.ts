/**
 * anonymize.helper.spec.ts — Unit tests for GDPR anonymization helper.
 * Tests hashPii determinism/truncation and anonymizeUsers for USER_PROGRESS,
 * ANNOTATIONS, and unsupported entity types.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLimit = vi.fn();
const mockUpdateWhere = vi.fn();
const mockSetValues = vi.fn();
const mockInsertValues = vi.fn();

vi.mock('@edusphere/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: (...a: unknown[]) => mockLimit(...a),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: (...a: unknown[]) => {
        mockSetValues(...a);
        return { where: (...b: unknown[]) => { mockUpdateWhere(...b); return Promise.resolve(undefined); } };
      },
    }),
    insert: vi.fn().mockReturnValue({
      values: (...a: unknown[]) => { mockInsertValues(...a); return Promise.resolve(undefined); },
    }),
  },
  schema: {
    users: { id: 'id', email: 'email', updated_at: 'updated_at' },
    auditLog: {},
  },
}));

import { hashPii, anonymizeUsers } from './anonymize.helper.js';

describe('anonymize.helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([]);
  });

  describe('hashPii', () => {
    it('returns a 32-character hex string', () => {
      const result = hashPii('test@example.com');
      expect(result).toHaveLength(32);
      expect(result).toMatch(/^[0-9a-f]{32}$/);
    });

    it('is deterministic — same input produces same hash', () => {
      const a = hashPii('hello@world.com');
      const b = hashPii('hello@world.com');
      expect(a).toBe(b);
    });

    it('different inputs produce different hashes', () => {
      const a = hashPii('alice@example.com');
      const b = hashPii('bob@example.com');
      expect(a).not.toBe(b);
    });

    it('handles empty string without throwing', () => {
      const result = hashPii('');
      expect(result).toHaveLength(32);
    });
  });

  describe('anonymizeUsers', () => {
    it('skips unsupported entity types and returns zero count', async () => {
      const result = await anonymizeUsers('COURSES', new Date());
      expect(result).toEqual({ deletedCount: 0, mode: 'ANONYMIZE_SKIPPED' });
      expect(mockLimit).not.toHaveBeenCalled();
    });

    it('returns zero count when no stale users found', async () => {
      mockLimit.mockResolvedValueOnce([]);
      const result = await anonymizeUsers('USER_PROGRESS', new Date());
      expect(result).toEqual({ deletedCount: 0, mode: 'ANONYMIZE' });
    });

    it('accepts ANNOTATIONS entity type', async () => {
      mockLimit.mockResolvedValueOnce([]);
      const result = await anonymizeUsers('ANNOTATIONS', new Date());
      expect(result).toEqual({ deletedCount: 0, mode: 'ANONYMIZE' });
    });

    it('anonymizes stale users and creates audit log entries', async () => {
      const staleUsers = [
        { userId: 'u-1', email: 'alice@test.com' },
        { userId: 'u-2', email: 'bob@test.com' },
      ];
      mockLimit.mockResolvedValueOnce(staleUsers);

      const result = await anonymizeUsers('USER_PROGRESS', new Date('2026-01-01'));

      expect(result.deletedCount).toBe(2);
      expect(result.mode).toBe('ANONYMIZE');
      expect(mockSetValues).toHaveBeenCalledTimes(2);
      expect(mockInsertValues).toHaveBeenCalledTimes(2);
    });

    it('sets first/last name to ANONYMIZED and clears avatar', async () => {
      mockLimit.mockResolvedValueOnce([{ userId: 'u-3', email: 'x@y.com' }]);

      await anonymizeUsers('USER_PROGRESS', new Date());

      expect(mockSetValues).toHaveBeenCalledOnce();
      const setArg = mockSetValues.mock.calls[0][0] as Record<string, unknown>;
      expect(setArg['first_name']).toBe('ANONYMIZED');
      expect(setArg['last_name']).toBe('ANONYMIZED');
      expect(setArg['avatar_url']).toBeNull();
    });

    it('hashes the email in the update', async () => {
      mockLimit.mockResolvedValueOnce([{ userId: 'u-5', email: 'test@mail.com' }]);

      await anonymizeUsers('USER_PROGRESS', new Date());

      const setArg = mockSetValues.mock.calls[0][0] as Record<string, unknown>;
      const hashedEmail = setArg['email'] as string;
      expect(hashedEmail).toHaveLength(32);
      expect(hashedEmail).toMatch(/^[0-9a-f]{32}$/);
      expect(hashedEmail).not.toBe('test@mail.com');
    });

    it('includes GDPR article 17 metadata in audit log', async () => {
      mockLimit.mockResolvedValueOnce([{ userId: 'u-4', email: 'z@w.com' }]);

      await anonymizeUsers('ANNOTATIONS', new Date('2026-06-01'));

      expect(mockInsertValues).toHaveBeenCalledOnce();
      const auditArg = mockInsertValues.mock.calls[0][0] as Record<string, unknown>;
      expect(auditArg['action']).toBe('GDPR_ANONYMIZE');
      expect(auditArg['resourceType']).toBe('USER');
      const metadata = auditArg['metadata'] as Record<string, unknown>;
      expect(metadata['gdprArticle']).toBe('17');
      expect(metadata['entityType']).toBe('ANNOTATIONS');
    });
  });
});
