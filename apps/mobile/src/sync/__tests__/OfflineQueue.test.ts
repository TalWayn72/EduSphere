/**
 * Tests for OfflineQueue — verifies enqueue/dequeue/peek/eviction and conflict behaviour.
 * Uses expo-sqlite mock (injected via vi.mock).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock expo-sqlite ────────────────────────────────────────────────────────
const queueRows: Record<string, unknown>[] = [];
const conflictRows: Record<string, unknown>[] = [];

const mockDb = {
  execSync: vi.fn(),
  runSync: vi.fn((sql: string, params?: unknown[]) => {
    if (sql.startsWith('INSERT') && sql.includes('offline_queue')) {
      const [id, opName, query, variables, tenantId, userId, createdAt] =
        params as string[];
      queueRows.push({
        id,
        operation_name: opName,
        query,
        variables,
        tenant_id: tenantId,
        user_id: userId,
        created_at: Number(createdAt),
        retry_count: 0,
      });
    } else if (sql.startsWith('INSERT') && sql.includes('offline_conflicts')) {
      const [id, opName, failedAt, retryCount, errorReason] =
        params as unknown[];
      conflictRows.push({
        id,
        operation_name: opName,
        failed_at: failedAt,
        retry_count: retryCount,
        error_reason: errorReason,
      });
    } else if (
      sql.startsWith('DELETE') &&
      sql.includes('offline_queue') &&
      params?.length
    ) {
      // dequeue — DELETE with id param
      const id = (params as string[])[0];
      const idx = queueRows.findIndex((r) => (r as { id: string }).id === id);
      if (idx !== -1) queueRows.splice(idx, 1);
    } else if (sql.startsWith('DELETE') && sql.includes('offline_queue')) {
      // clearAll — no params
      queueRows.length = 0;
    } else if (
      sql.startsWith('DELETE') &&
      sql.includes('offline_conflicts') &&
      params?.length
    ) {
      const id = (params as string[])[0];
      const idx = conflictRows.findIndex(
        (r) => (r as { id: string }).id === id
      );
      if (idx !== -1) conflictRows.splice(idx, 1);
    } else if (sql.startsWith('UPDATE')) {
      const id = (params as string[])[0];
      const row = queueRows.find((r) => (r as { id: string }).id === id) as
        | { retry_count: number }
        | undefined;
      if (row) row.retry_count += 1;
    }
  }),
  getFirstSync: vi.fn((sql: string) => {
    if (sql.includes('offline_conflicts')) return { c: conflictRows.length };
    return { c: queueRows.length };
  }),
  getAllSync: vi.fn((sql: string, params?: unknown[]) => {
    if (sql.includes('offline_conflicts')) {
      return [...conflictRows].sort(
        (a, b) =>
          (b as { failed_at: number }).failed_at -
          (a as { failed_at: number }).failed_at
      );
    }
    const limit = (params as number[])?.[0] ?? 10;
    return [...queueRows]
      .sort(
        (a, b) =>
          (a as { created_at: number }).created_at -
          (b as { created_at: number }).created_at
      )
      .slice(0, limit);
  }),
  closeSync: vi.fn(),
};

vi.mock('expo-sqlite', () => ({
  openDatabaseSync: () => mockDb,
}));

import {
  enqueue,
  dequeue,
  peek,
  incrementRetry,
  queueSize,
  clearAll,
  addConflict,
  getConflicts,
  resolveConflict,
  conflictCount,
  type QueuedMutation,
} from '../OfflineQueue';

beforeEach(() => {
  queueRows.length = 0;
  conflictRows.length = 0;
  vi.clearAllMocks();
});

const base: Omit<QueuedMutation, 'retryCount'> = {
  id: 'mut-1',
  operationName: 'AddAnnotation',
  query: '{ addAnnotation }',
  variables: { text: 'hi' },
  tenantId: 'tenant-a',
  userId: 'user-1',
  createdAt: Date.now(),
};

describe('OfflineQueue — queue operations', () => {
  it('enqueues a mutation and queueSize returns 1', () => {
    enqueue(base);
    expect(queueSize()).toBe(1);
  });

  it('peek returns enqueued mutations in created_at order', () => {
    enqueue({ ...base, id: 'a', createdAt: 1000 });
    enqueue({ ...base, id: 'b', createdAt: 2000 });
    const items = peek(10);
    expect(items[0].id).toBe('a');
    expect(items[1].id).toBe('b');
  });

  it('dequeue removes the mutation', () => {
    enqueue(base);
    dequeue(base.id);
    expect(queueSize()).toBe(0);
  });

  it('incrementRetry increases retry_count', () => {
    enqueue(base);
    incrementRetry(base.id);
    const row = queueRows[0] as { retry_count: number };
    expect(row.retry_count).toBe(1);
  });

  it('clearAll empties the queue', () => {
    enqueue({ ...base, id: 'x1' });
    enqueue({ ...base, id: 'x2' });
    clearAll();
    expect(queueSize()).toBe(0);
  });
});

describe('OfflineQueue — conflict operations', () => {
  const failedMutation: QueuedMutation = { ...base, retryCount: 3 };

  it('addConflict stores a conflicted mutation', () => {
    addConflict(failedMutation, 'max_retries_exceeded');
    expect(conflictCount()).toBe(1);
  });

  it('getConflicts returns stored conflicts with correct fields', () => {
    addConflict(failedMutation, 'max_retries_exceeded');
    const conflicts = getConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].id).toBe(failedMutation.id);
    expect(conflicts[0].operationName).toBe(failedMutation.operationName);
    expect(conflicts[0].errorReason).toBe('max_retries_exceeded');
    expect(conflicts[0].retryCount).toBe(3);
  });

  it('resolveConflict removes a specific conflict', () => {
    addConflict({ ...failedMutation, id: 'c1' }, 'max_retries_exceeded');
    addConflict({ ...failedMutation, id: 'c2' }, 'max_retries_exceeded');
    expect(conflictCount()).toBe(2);
    resolveConflict('c1');
    expect(conflictCount()).toBe(1);
    expect(getConflicts()[0].id).toBe('c2');
  });

  it('conflictCount returns 0 when no conflicts', () => {
    expect(conflictCount()).toBe(0);
  });

  it('conflict queue is independent from mutation queue', () => {
    enqueue(base);
    addConflict(failedMutation, 'max_retries_exceeded');
    expect(queueSize()).toBe(1);
    expect(conflictCount()).toBe(1);
    clearAll(); // only clears mutation queue
    expect(queueSize()).toBe(0);
    expect(conflictCount()).toBe(1);
  });
});
