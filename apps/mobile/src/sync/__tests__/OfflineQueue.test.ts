/**
 * Tests for OfflineQueue — verifies enqueue/dequeue/peek/eviction behaviour.
 * Uses expo-sqlite mock (injected via jest moduleNameMapper or manual mock).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock expo-sqlite ────────────────────────────────────────────────────────
const rows: Record<string, unknown>[] = [];
const mockDb = {
  execSync: vi.fn(),
  runSync: vi.fn((sql: string, params?: unknown[]) => {
    if (sql.startsWith('INSERT')) {
      const [id, opName, query, variables, tenantId, userId, createdAt] =
        params as string[];
      rows.push({
        id,
        operation_name: opName,
        query,
        variables,
        tenant_id: tenantId,
        user_id: userId,
        created_at: Number(createdAt),
        retry_count: 0,
      });
    } else if (sql.startsWith('DELETE')) {
      const id = (params as string[])[0];
      const idx = rows.findIndex((r) => (r as { id: string }).id === id);
      if (idx !== -1) rows.splice(idx, 1);
    } else if (sql.startsWith('UPDATE')) {
      const id = (params as string[])[0];
      const row = rows.find((r) => (r as { id: string }).id === id) as
        | { retry_count: number }
        | undefined;
      if (row) row.retry_count += 1;
    }
  }),
  getFirstSync: vi.fn(() => ({ c: rows.length })),
  getAllSync: vi.fn((_sql: string, params?: unknown[]) => {
    const limit = (params as number[])?.[0] ?? 10;
    return [...rows]
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

// Re-import after mock is set up
import {
  enqueue,
  dequeue,
  peek,
  incrementRetry,
  queueSize,
  clearAll,
} from '../OfflineQueue';

beforeEach(() => {
  rows.length = 0;
  vi.clearAllMocks();
});

describe('OfflineQueue', () => {
  const base = {
    id: 'mut-1',
    operationName: 'AddAnnotation',
    query: '{ addAnnotation }',
    variables: { text: 'hi' },
    tenantId: 'tenant-a',
    userId: 'user-1',
    createdAt: Date.now(),
  };

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
    const row = rows[0] as { retry_count: number };
    expect(row.retry_count).toBe(1);
  });

  it('clearAll empties the queue', () => {
    enqueue({ ...base, id: 'x1' });
    enqueue({ ...base, id: 'x2' });
    clearAll();
    expect(queueSize()).toBe(0);
  });
});
