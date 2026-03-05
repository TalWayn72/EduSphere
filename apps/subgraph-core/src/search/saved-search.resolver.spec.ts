/**
 * saved-search.resolver.spec.ts — Unit tests for SavedSearchResolver.
 * Direct class instantiation — no NestJS TestingModule.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('./saved-search.service.js', () => ({
  SavedSearchService: class {},
}));

import { SavedSearchResolver } from './saved-search.resolver.js';

const SEARCHES = [
  { id: 'ss-1', name: 'My Search', query: 'foo', userId: 'u1', tenantId: 't1' },
];

function makeService(
  overrides: Partial<{
    listSavedSearches: () => Promise<unknown[]>;
    createSavedSearch: () => Promise<unknown>;
    deleteSavedSearch: () => Promise<boolean>;
  }> = {}
) {
  return {
    listSavedSearches: vi.fn().mockResolvedValue(SEARCHES),
    createSavedSearch: vi.fn().mockResolvedValue(SEARCHES[0]),
    deleteSavedSearch: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeCtx(auth?: Record<string, unknown>) {
  return { authContext: auth } as Parameters<SavedSearchResolver['getSavedSearches']>[0];
}

describe('SavedSearchResolver', () => {
  let resolver: SavedSearchResolver;
  let svc: ReturnType<typeof makeService>;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = makeService();
    resolver = new SavedSearchResolver(svc as never);
  });

  // ── getSavedSearches ──────────────────────────────────────────────────────

  it('getSavedSearches throws UnauthorizedException when no auth', async () => {
    await expect(resolver.getSavedSearches(makeCtx(undefined))).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it('getSavedSearches calls service with userId + tenantId', async () => {
    await resolver.getSavedSearches(makeCtx({ userId: 'u1', tenantId: 't1' }));
    expect(svc.listSavedSearches).toHaveBeenCalledWith('u1', 't1');
  });

  it('getSavedSearches returns the service result', async () => {
    const result = await resolver.getSavedSearches(makeCtx({ userId: 'u1', tenantId: 't1' }));
    expect(result).toBe(SEARCHES);
  });

  // ── createSavedSearch ─────────────────────────────────────────────────────

  it('createSavedSearch throws UnauthorizedException when no auth', async () => {
    await expect(
      resolver.createSavedSearch({ name: 'x', query: 'y' }, makeCtx(undefined))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('createSavedSearch delegates to service with parsed input', async () => {
    await resolver.createSavedSearch(
      { name: 'Search1', query: 'graphql', filters: '{"lang":"he"}' },
      makeCtx({ userId: 'u1', tenantId: 't1' })
    );
    expect(svc.createSavedSearch).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Search1', query: 'graphql', userId: 'u1', tenantId: 't1' })
    );
  });

  it('createSavedSearch passes undefined filters when not provided', async () => {
    await resolver.createSavedSearch(
      { name: 'Search2', query: 'bar' },
      makeCtx({ userId: 'u1', tenantId: 't1' })
    );
    expect(svc.createSavedSearch).toHaveBeenCalledWith(
      expect.objectContaining({ filters: undefined })
    );
  });

  // ── deleteSavedSearch ─────────────────────────────────────────────────────

  it('deleteSavedSearch throws UnauthorizedException when no auth', async () => {
    await expect(
      resolver.deleteSavedSearch('ss-1', makeCtx(undefined))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deleteSavedSearch calls service with id + userId + tenantId', async () => {
    await resolver.deleteSavedSearch('ss-1', makeCtx({ userId: 'u1', tenantId: 't1' }));
    expect(svc.deleteSavedSearch).toHaveBeenCalledWith('ss-1', 'u1', 't1');
  });

  it('deleteSavedSearch returns true on success', async () => {
    const result = await resolver.deleteSavedSearch(
      'ss-1',
      makeCtx({ userId: 'u1', tenantId: 't1' })
    );
    expect(result).toBe(true);
  });
});
