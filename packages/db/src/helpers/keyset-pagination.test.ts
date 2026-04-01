import { describe, it, expect } from 'vitest';
import {
  encodeCursor,
  decodeCursor,
  buildRelayConnection,
} from './keyset-pagination';

describe('keyset-pagination', () => {
  // ── encodeCursor / decodeCursor ──────────────────────────────────────────

  describe('encodeCursor + decodeCursor', () => {
    it('round-trips a string timestamp + id', () => {
      const cursor = encodeCursor('2026-01-15T10:00:00.000Z', 'abc-123');
      const decoded = decodeCursor(cursor);
      expect(decoded).toEqual({
        createdAt: '2026-01-15T10:00:00.000Z',
        id: 'abc-123',
      });
    });

    it('round-trips a Date object', () => {
      const date = new Date('2026-03-01T08:30:00.000Z');
      const cursor = encodeCursor(date, 'xyz-789');
      const decoded = decodeCursor(cursor);
      expect(decoded).toEqual({
        createdAt: '2026-03-01T08:30:00.000Z',
        id: 'xyz-789',
      });
    });

    it('returns null for invalid base64', () => {
      expect(decodeCursor('not-valid-base64!!!')).toBeNull();
    });

    it('returns null for valid base64 but missing fields', () => {
      const bad = Buffer.from(JSON.stringify({ foo: 'bar' })).toString(
        'base64'
      );
      expect(decodeCursor(bad)).toBeNull();
    });

    it('returns null for valid base64 with wrong field types', () => {
      const bad = Buffer.from(
        JSON.stringify({ createdAt: 123, id: true })
      ).toString('base64');
      expect(decodeCursor(bad)).toBeNull();
    });
  });

  // ── buildRelayConnection ─────────────────────────────────────────────────

  describe('buildRelayConnection', () => {
    const makeRows = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `row-${String(i)}`,
        createdAt: new Date(2026, 0, 1 + i).toISOString(),
        name: `Item ${String(i)}`,
      }));

    it('trims to `first` items and sets hasNextPage when rows > first', () => {
      const rows = makeRows(6); // fetched first+1
      const conn = buildRelayConnection(rows, 5, 20, null);
      expect(conn.nodes).toHaveLength(5);
      expect(conn.edges).toHaveLength(5);
      expect(conn.pageInfo.hasNextPage).toBe(true);
    });

    it('hasNextPage is false when rows <= first', () => {
      const rows = makeRows(3);
      const conn = buildRelayConnection(rows, 5, 3, null);
      expect(conn.pageInfo.hasNextPage).toBe(false);
      expect(conn.nodes).toHaveLength(3);
    });

    it('hasPreviousPage is true when afterCursor is provided', () => {
      const rows = makeRows(2);
      const conn = buildRelayConnection(rows, 5, 10, 'some-cursor');
      expect(conn.pageInfo.hasPreviousPage).toBe(true);
    });

    it('hasPreviousPage is false when afterCursor is null', () => {
      const rows = makeRows(2);
      const conn = buildRelayConnection(rows, 5, 2, null);
      expect(conn.pageInfo.hasPreviousPage).toBe(false);
    });

    it('returns valid cursors that can be decoded', () => {
      const rows = makeRows(3);
      const conn = buildRelayConnection(rows, 5, 3, null);
      for (const edge of conn.edges) {
        const decoded = decodeCursor(edge.cursor);
        expect(decoded).not.toBeNull();
        expect(decoded!.id).toBe(edge.node.id);
      }
    });

    it('startCursor and endCursor match first and last edges', () => {
      const rows = makeRows(4);
      const conn = buildRelayConnection(rows, 5, 4, null);
      expect(conn.pageInfo.startCursor).toBe(conn.edges[0]!.cursor);
      expect(conn.pageInfo.endCursor).toBe(conn.edges[3]!.cursor);
    });

    it('handles empty result set', () => {
      const conn = buildRelayConnection([], 10, 0, null);
      expect(conn.edges).toHaveLength(0);
      expect(conn.nodes).toHaveLength(0);
      expect(conn.pageInfo.hasNextPage).toBe(false);
      expect(conn.pageInfo.startCursor).toBeNull();
      expect(conn.pageInfo.endCursor).toBeNull();
    });

    it('totalCount is passed through', () => {
      const rows = makeRows(2);
      const conn = buildRelayConnection(rows, 10, 42, null);
      expect(conn.totalCount).toBe(42);
    });

    it('supports created_at (snake_case) field', () => {
      const rows = [
        { id: 'r-1', created_at: '2026-02-01T00:00:00.000Z', title: 'A' },
      ];
      const conn = buildRelayConnection(rows, 10, 1, null);
      const decoded = decodeCursor(conn.edges[0]!.cursor);
      expect(decoded!.createdAt).toBe('2026-02-01T00:00:00.000Z');
    });
  });
});
