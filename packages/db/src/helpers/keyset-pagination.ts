/**
 * Keyset (cursor-based) pagination helpers for Relay connections.
 *
 * Uses a composite `(createdAt, id)` cursor instead of offset-based cursors.
 * This is safe for concurrent writes — offsets skip/duplicate rows on inserts,
 * whereas keyset cursors always point to a stable position.
 *
 * Cursor format: base64(JSON.stringify({ createdAt, id }))
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface KeysetCursor {
  /** ISO-8601 timestamp */
  createdAt: string;
  /** Row UUID */
  id: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface Edge<T> {
  cursor: string;
  node: T;
}

export interface RelayConnection<T> {
  edges: Edge<T>[];
  nodes: T[];
  pageInfo: PageInfo;
  totalCount: number;
}

// ── Cursor encoding / decoding ───────────────────────────────────────────────

export function encodeCursor(createdAt: string | Date, id: string): string {
  const iso =
    createdAt instanceof Date ? createdAt.toISOString() : createdAt;
  return Buffer.from(JSON.stringify({ createdAt: iso, id })).toString(
    'base64'
  );
}

export function decodeCursor(cursor: string): KeysetCursor | null {
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(json) as Partial<KeysetCursor>;
    if (
      typeof parsed.createdAt === 'string' &&
      typeof parsed.id === 'string'
    ) {
      return { createdAt: parsed.createdAt, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Connection builder ───────────────────────────────────────────────────────

/**
 * Build a Relay connection from a result set.
 *
 * The caller should fetch `first + 1` rows so we can detect `hasNextPage`.
 * Each row must have at least `id` and `createdAt` (or `created_at`) fields.
 */
export function buildRelayConnection<
  T extends { id: string; createdAt?: string | Date; created_at?: string | Date },
>(
  rows: T[],
  first: number,
  totalCount: number,
  afterCursor: string | null | undefined
): RelayConnection<T> {
  const hasNextPage = rows.length > first;
  const trimmed = hasNextPage ? rows.slice(0, first) : rows;

  const edges: Edge<T>[] = trimmed.map((node) => {
    const ts = node.createdAt ?? node.created_at ?? new Date().toISOString();
    return {
      cursor: encodeCursor(ts instanceof Date ? ts.toISOString() : ts, node.id),
      node,
    };
  });

  return {
    edges,
    nodes: trimmed,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: afterCursor != null,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
    totalCount,
  };
}
