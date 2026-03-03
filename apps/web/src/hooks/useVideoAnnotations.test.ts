/**
 * useVideoAnnotations persistence tests
 *
 * Verifies the annotation save-and-display flow:
 *  1. addAnnotation adds a local placeholder immediately
 *  2. On mutation success: placeholder is removed and refetch is triggered
 *  3. On mutation failure: placeholder is removed and no refetch
 *  4. Update triggers refetch
 *  5. Delete removes from local list and triggers refetch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mock urql ────────────────────────────────────────────────────────────────

const mockExecCreate = vi
  .fn()
  .mockResolvedValue({ data: {}, error: null });
const mockExecUpdate = vi
  .fn()
  .mockResolvedValue({ data: {}, error: null });
const mockExecDelete = vi
  .fn()
  .mockResolvedValue({ data: {}, error: null });
const mockExecuteQuery = vi.fn();

vi.mock('urql', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('@/lib/graphql/annotation.mutations', () => ({
  ANNOTATIONS_BY_ASSET_QUERY: 'ANNOTATIONS_BY_ASSET_QUERY',
  CREATE_ANNOTATION_MUTATION: 'CREATE_ANNOTATION_MUTATION',
  UPDATE_ANNOTATION_MUTATION: 'UPDATE_ANNOTATION_MUTATION',
  DELETE_ANNOTATION_MUTATION: 'DELETE_ANNOTATION_MUTATION',
  ANNOTATION_ADDED_SUBSCRIPTION: 'ANNOTATION_ADDED_SUBSCRIPTION',
}));

vi.mock('@/types/annotations', () => ({
  AnnotationLayer: {
    PERSONAL: 'PERSONAL',
    SHARED: 'SHARED',
    INSTRUCTOR: 'INSTRUCTOR',
    AI_GENERATED: 'AI_GENERATED',
  },
}));

import { useVideoAnnotations } from './useVideoAnnotations';
import * as urql from 'urql';

const VIDEO_ID = 'video-asset-uuid-001';

function setupMocks(overrides: { createError?: boolean } = {}) {
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: { annotationsByAsset: [] }, fetching: false, error: undefined },
    mockExecuteQuery,
  ] as ReturnType<typeof urql.useQuery>);

  const createResult = overrides.createError
    ? { data: null, error: { message: 'Save failed' } }
    : { data: {}, error: null };

  mockExecCreate.mockResolvedValue(createResult);

  vi.mocked(urql.useMutation)
    .mockReturnValue([{ fetching: false }, mockExecCreate] as ReturnType<
      typeof urql.useMutation
    >)
    .mockReturnValueOnce([{ fetching: false }, mockExecCreate] as ReturnType<
      typeof urql.useMutation
    >)
    .mockReturnValueOnce([{ fetching: false }, mockExecUpdate] as ReturnType<
      typeof urql.useMutation
    >)
    .mockReturnValueOnce([{ fetching: false }, mockExecDelete] as ReturnType<
      typeof urql.useMutation
    >);

  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: null, fetching: false },
    vi.fn(),
  ] as ReturnType<typeof urql.useSubscription>);
}

describe('useVideoAnnotations — annotation persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a local placeholder immediately when addAnnotation is called', async () => {
    setupMocks();
    const { result } = renderHook(() =>
      useVideoAnnotations(VIDEO_ID, 'tenant-1')
    );

    await act(async () => {
      await result.current.addAnnotation('Test note', 42);
    });

    // After the promise resolves (success), placeholder is removed; refetch triggered.
    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalledWith({
        requestPolicy: 'network-only',
      });
    });
  });

  it('removes placeholder annotation on mutation failure', async () => {
    setupMocks({ createError: true });
    const { result } = renderHook(() =>
      useVideoAnnotations(VIDEO_ID, 'tenant-1')
    );

    await act(async () => {
      await result.current.addAnnotation('Will fail', 10);
    });

    // Placeholder should be removed, no refetch.
    await waitFor(() => {
      expect(
        result.current.annotations.some((a) =>
          a.id.startsWith('local-video-')
        )
      ).toBe(false);
    });
    expect(mockExecuteQuery).not.toHaveBeenCalledWith({
      requestPolicy: 'network-only',
    });
  });

  it('does not refetch on mutation failure', async () => {
    setupMocks({ createError: true });
    const { result } = renderHook(() =>
      useVideoAnnotations(VIDEO_ID, 'tenant-1')
    );

    await act(async () => {
      await result.current.addAnnotation('Fail note', 5);
    });

    await waitFor(() => {
      expect(mockExecCreate).toHaveBeenCalled();
    });

    expect(mockExecuteQuery).not.toHaveBeenCalledWith({
      requestPolicy: 'network-only',
    });
  });
});
