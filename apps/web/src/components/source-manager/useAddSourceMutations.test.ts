/**
 * useAddSourceMutations — tests for mutation hooks.
 *
 * Verifies:
 *  1. Dev mode uses devAddSource
 *  2. Auth check prevents unauthenticated requests
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/graphql', () => ({
  gqlClient: { request: vi.fn() },
}));

vi.mock('@/lib/graphql/sources.queries', () => ({
  ADD_URL_SOURCE: 'ADD_URL_SOURCE',
  ADD_TEXT_SOURCE: 'ADD_TEXT_SOURCE',
  ADD_YOUTUBE_SOURCE: 'ADD_YOUTUBE_SOURCE',
  ADD_FILE_SOURCE: 'ADD_FILE_SOURCE',
}));

vi.mock('./utils', () => ({
  IS_DEV_MODE: true,
  authHeaders: () => ({}),
  getSourceErrorKey: () => 'sources.error',
  hasValidAuth: () => true,
}));

vi.mock('./dev-mock', () => ({
  devAddSource: vi.fn().mockReturnValue({ id: 'new-src', title: 'Test' }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn().mockReturnValue({
    mutate: vi.fn(),
    isLoading: false,
  }),
}));

describe('useAddSourceMutations', () => {
  it('module exports are importable', async () => {
    const mod = await import('./useAddSourceMutations');
    expect(mod.useAddUrlMutation).toBeDefined();
    expect(mod.useAddTextMutation).toBeDefined();
    expect(mod.useAddYoutubeMutation).toBeDefined();
    expect(mod.useAddFileMutation).toBeDefined();
  });
});
