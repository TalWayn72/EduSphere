/**
 * content.db.spec.ts
 * Unit tests for fetchContentItem — Drizzle ORM content fetching with RLS.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockWithTenantContext = vi.fn();
const mockCreateDatabaseConnection = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockCreateDatabaseConnection(),
  schema: {
    contentItems: {
      id: 'ci.id',
      title: 'ci.title',
      type: 'ci.type',
      content: 'ci.content',
    },
  },
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn().mockReturnValue({ __eq: true }),
}));

vi.mock('@nestjs/common', () => {
  class MockLogger {
    debug = vi.fn();
    warn = vi.fn();
    error = vi.fn();
  }
  return { Logger: MockLogger };
});

import { fetchContentItem } from './content.db.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-xyz';
const CONTENT_ID = 'ci-123';

function setupTenantContext(
  item: {
    id: string;
    title: string;
    type: string;
    content: string | null;
  } | null
) {
  mockCreateDatabaseConnection.mockReturnValue({});
  mockWithTenantContext.mockImplementation(
    async (
      _db: unknown,
      _ctx: unknown,
      fn: (tx: unknown) => Promise<unknown>
    ) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => (item ? [item] : []),
            }),
          }),
        }),
      };
      return fn(tx);
    }
  );
}

describe('fetchContentItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns content item with truncated content', async () => {
    setupTenantContext({
      id: CONTENT_ID,
      title: 'Intro to TypeScript',
      type: 'LECTURE',
      content: 'A'.repeat(1000),
    });

    const result = await fetchContentItem(CONTENT_ID, TENANT_ID);

    expect(result).toEqual({
      id: CONTENT_ID,
      title: 'Intro to TypeScript',
      type: 'LECTURE',
      content: 'A'.repeat(500),
    });
  });

  it('returns null when content item not found', async () => {
    setupTenantContext(null);

    const result = await fetchContentItem('nonexistent', TENANT_ID);

    expect(result).toBeNull();
  });

  it('passes correct tenant context to withTenantContext', async () => {
    setupTenantContext({
      id: CONTENT_ID,
      title: 'Test',
      type: 'QUIZ',
      content: null,
    });

    await fetchContentItem(CONTENT_ID, TENANT_ID);

    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(), // db
      { tenantId: TENANT_ID, userId: 'system', userRole: 'STUDENT' },
      expect.any(Function)
    );
  });

  it('returns null content when item content is null', async () => {
    setupTenantContext({
      id: CONTENT_ID,
      title: 'No Content',
      type: 'ACTIVITY',
      content: null,
    });

    const result = await fetchContentItem(CONTENT_ID, TENANT_ID);

    expect(result).toEqual({
      id: CONTENT_ID,
      title: 'No Content',
      type: 'ACTIVITY',
      content: null,
    });
  });

  it('does not truncate short content', async () => {
    const shortContent = 'Short text';
    setupTenantContext({
      id: CONTENT_ID,
      title: 'Short',
      type: 'LECTURE',
      content: shortContent,
    });

    const result = await fetchContentItem(CONTENT_ID, TENANT_ID);

    expect(result?.content).toBe(shortContent);
  });

  it('returns null on database error', async () => {
    mockCreateDatabaseConnection.mockReturnValue({});
    mockWithTenantContext.mockRejectedValue(new Error('DB connection failed'));

    const result = await fetchContentItem(CONTENT_ID, TENANT_ID);

    expect(result).toBeNull();
  });

  it('calls createDatabaseConnection for each invocation', async () => {
    setupTenantContext(null);

    await fetchContentItem('id-1', TENANT_ID);
    await fetchContentItem('id-2', TENANT_ID);

    expect(mockCreateDatabaseConnection).toHaveBeenCalledTimes(2);
  });

  it('truncates content to exactly 500 characters', async () => {
    const exactContent = 'B'.repeat(501);
    setupTenantContext({
      id: CONTENT_ID,
      title: 'Exact',
      type: 'LECTURE',
      content: exactContent,
    });

    const result = await fetchContentItem(CONTENT_ID, TENANT_ID);

    expect(result?.content?.length).toBe(500);
  });
});
