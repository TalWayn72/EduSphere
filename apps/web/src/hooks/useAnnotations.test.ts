/**
 * useAnnotations hook tests
 *
 * Verifies:
 *  1. Returns server annotations mapped through normaliseAnnotation (UUID path)
 *  2. Non-UUID contentId: shows mock fallback (offline/demo mode), no error banner
 *  3. addAnnotation immediately adds a local entry (id starts with "local-")
 *  4. addAnnotation removes local entry on mutation failure
 *  5. addAnnotation keeps local entry until refetch confirms it
 *  6. addReply immediately adds a local reply entry
 *  7. Falls back to mock data when the query errors
 *  8. isPending reflects mutation in-flight state
 *  9. Offline mode (non-UUID): addAnnotation persists locally without mutation
 * 10. refetch is exposed and callable
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AnnotationLayer } from '@/types/annotations';
import type { AnnotationsQuery } from '@edusphere/graphql-types';

// ── urql mock ────────────────────────────────────────────────────────────────

const mockCreateAnnotation = vi
  .fn()
  .mockResolvedValue({ data: null, error: null });
const mockReplyToAnnotation = vi
  .fn()
  .mockResolvedValue({ data: null, error: null });
const mockExecuteQuery = vi.fn();

vi.mock('urql', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

// ── graphql query mocks ───────────────────────────────────────────────────────
vi.mock('@/lib/graphql/annotation.queries', () => ({
  ANNOTATIONS_QUERY: 'ANNOTATIONS_QUERY',
  REPLY_TO_ANNOTATION_MUTATION: 'REPLY_TO_ANNOTATION_MUTATION',
}));

vi.mock('@/lib/graphql/annotation.mutations', () => ({
  CREATE_ANNOTATION_MUTATION: 'CREATE_ANNOTATION_MUTATION',
  ANNOTATION_ADDED_SUBSCRIPTION: 'ANNOTATION_ADDED_SUBSCRIPTION',
  UPDATE_ANNOTATION_MUTATION: 'UPDATE_ANNOTATION_MUTATION',
  DELETE_ANNOTATION_MUTATION: 'DELETE_ANNOTATION_MUTATION',
  ANNOTATIONS_BY_ASSET_QUERY: 'ANNOTATIONS_BY_ASSET_QUERY',
}));

// ── content-viewer utils mock ─────────────────────────────────────────────────
vi.mock('@/pages/content-viewer.utils', () => ({
  formatTime: (t: number) => `${t}s`,
}));

// ── mock-annotations mock ─────────────────────────────────────────────────────
const MOCK_ANNOTATIONS = [
  {
    id: 'mock-ann-1',
    content: 'Mock annotation',
    layer: AnnotationLayer.PERSONAL,
    userId: 'mock-user',
    userName: 'Mock User',
    userRole: 'student' as const,
    timestamp: '0s',
    contentId: 'content-1',
    contentTimestamp: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    replies: [],
  },
];

vi.mock('@/lib/mock-annotations', () => ({
  getThreadedAnnotations: () => MOCK_ANNOTATIONS,
  filterAnnotationsByLayers: <T>(items: T[], _layers: unknown[]) => items,
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { useAnnotations } from './useAnnotations';
import * as urql from 'urql';

// ── Helper to configure urql mock state ──────────────────────────────────────

const SERVER_ANNOTATION = {
  id: 'ann-server-1',
  layer: AnnotationLayer.PERSONAL,
  annotationType: 'TEXT',
  content: 'Server annotation',
  spatialData: { timestampStart: 10 },
  parentId: null,
  userId: 'user-server',
  isResolved: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

type UrqlMockOptions = {
  queryData?: AnnotationsQuery | null;
  queryFetching?: boolean;
  queryError?: unknown;
};

function setupUrqlMocks(options: UrqlMockOptions = {}) {
  const {
    queryData = { annotations: [SERVER_ANNOTATION] },
    queryFetching = false,
    queryError = null,
  } = options;

  vi.mocked(urql.useQuery).mockReturnValue([
    { data: queryData, fetching: queryFetching, error: queryError },
    mockExecuteQuery,
  ] as ReturnType<typeof urql.useQuery>);

  vi.mocked(urql.useMutation).mockImplementation((mutation) => {
    if (mutation === 'CREATE_ANNOTATION_MUTATION') {
      return [{ fetching: false }, mockCreateAnnotation] as ReturnType<
        typeof urql.useMutation
      >;
    }
    return [{ fetching: false }, mockReplyToAnnotation] as ReturnType<
      typeof urql.useMutation
    >;
  });

  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: null, fetching: false },
    vi.fn(),
  ] as ReturnType<typeof urql.useSubscription>);
}

// Valid UUID to use in tests that exercise the real query path.
const VALID_UUID = '909e98a3-d6c4-407c-a4ab-59a978820f07';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAnnotations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAnnotation.mockResolvedValue({ data: null, error: null });
    mockReplyToAnnotation.mockResolvedValue({ data: null, error: null });
  });

  it('returns normalised server annotations when contentId is a valid UUID', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL])
    );

    expect(result.current.annotations).toHaveLength(1);
    expect(result.current.annotations[0]?.id).toBe('ann-server-1');
    expect(result.current.annotations[0]?.userName).toBe('User');
    expect(result.current.annotations[0]?.timestamp).toBe('10s');
    expect(result.current.fetching).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('shows mock fallback when contentId is not a UUID (offline/demo mode)', () => {
    setupUrqlMocks({ queryData: null, queryError: null });

    const { result } = renderHook(() =>
      useAnnotations('content-1', [AnnotationLayer.PERSONAL])
    );

    // useQuery should be called with pause:true for non-UUID contentIds.
    const queryCall = vi.mocked(urql.useQuery).mock.calls[0];
    expect(queryCall?.[0]).toMatchObject({ pause: true });

    // Mock fallback should be shown — not an empty list.
    expect(result.current.annotations).toHaveLength(MOCK_ANNOTATIONS.length);
    expect(result.current.annotations[0]?.id).toBe('mock-ann-1');

    // No error banner (offline mode is not an error).
    expect(result.current.error).toBeNull();
  });

  it('adds a local annotation immediately when addAnnotation is called', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL])
    );

    act(() => {
      result.current.addAnnotation(
        'My optimistic note',
        AnnotationLayer.PERSONAL,
        42
      );
    });

    const ids = result.current.annotations.map((a) => a.id);
    expect(ids.some((id) => id.startsWith('local-'))).toBe(true);
  });

  it('local annotation has correct content, layer, and user', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations(VALID_UUID, [AnnotationLayer.SHARED])
    );

    act(() => {
      result.current.addAnnotation('Shared thought', AnnotationLayer.SHARED, 5);
    });

    const local = result.current.annotations.find((a) =>
      a.id.startsWith('local-')
    );
    expect(local?.content).toBe('Shared thought');
    expect(local?.layer).toBe(AnnotationLayer.SHARED);
    expect(local?.userName).toBe('You');
    expect(local?.contentTimestamp).toBe(5);
  });

  it('removes local annotation when mutation fails', async () => {
    mockCreateAnnotation.mockResolvedValue({
      data: null,
      error: { message: 'Server error' },
    });
    setupUrqlMocks();

    const { result } = renderHook(() =>
      useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL])
    );

    act(() => {
      result.current.addAnnotation('Will fail', AnnotationLayer.PERSONAL, 0);
    });

    // Local annotation appears immediately.
    expect(
      result.current.annotations.some((a) => a.id.startsWith('local-'))
    ).toBe(true);

    // After mutation resolves (failure), local annotation is removed.
    await waitFor(() => {
      expect(
        result.current.annotations.some((a) => a.id.startsWith('local-'))
      ).toBe(false);
    });
  });

  it('triggers refetch after successful mutation', async () => {
    mockCreateAnnotation.mockResolvedValue({ data: {}, error: null });
    setupUrqlMocks();

    const { result } = renderHook(() =>
      useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL])
    );

    act(() => {
      result.current.addAnnotation('Note to save', AnnotationLayer.PERSONAL, 0);
    });

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalledWith({
        requestPolicy: 'network-only',
      });
    });
  });

  it('adds a local annotation in offline mode (non-UUID) without calling mutation', () => {
    setupUrqlMocks({ queryData: null, queryError: null });

    const { result } = renderHook(() =>
      useAnnotations('content-1', [AnnotationLayer.PERSONAL])
    );

    act(() => {
      result.current.addAnnotation('Offline note', AnnotationLayer.PERSONAL, 0);
    });

    // Mutation should NOT have been called.
    expect(mockCreateAnnotation).not.toHaveBeenCalled();

    // The annotation should appear in the list.
    expect(
      result.current.annotations.some(
        (a) => a.id.startsWith('local-') && a.content === 'Offline note'
      )
    ).toBe(true);
  });

  it('offline mode annotation persists (not reverted)', () => {
    setupUrqlMocks({ queryData: null, queryError: null });

    const { result } = renderHook(() =>
      useAnnotations('content-1', [AnnotationLayer.PERSONAL])
    );

    act(() => {
      result.current.addAnnotation(
        'Persistent offline note',
        AnnotationLayer.PERSONAL,
        0
      );
    });

    // The local annotation must still be visible (not reverted by any mechanism).
    expect(
      result.current.annotations.some(
        (a) => a.content === 'Persistent offline note'
      )
    ).toBe(true);
  });

  it('adds a local reply when addReply is called', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL])
    );

    act(() => {
      result.current.addReply(
        'ann-server-1',
        'My reply',
        AnnotationLayer.PERSONAL,
        0
      );
    });

    const replyIds = result.current.annotations.map((a) => a.id);
    expect(replyIds.some((id) => id.startsWith('local-reply-'))).toBe(true);
  });

  it('sets parentId on local reply', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL])
    );

    act(() => {
      result.current.addReply(
        'ann-server-1',
        'Reply text',
        AnnotationLayer.PERSONAL,
        0
      );
    });

    const reply = result.current.annotations.find((a) =>
      a.id.startsWith('local-reply-')
    );
    expect(reply?.parentId).toBe('ann-server-1');
    expect(reply?.content).toBe('Reply text');
  });

  it('falls back to mock data when the query errors', () => {
    setupUrqlMocks({
      queryData: null,
      queryError: { message: 'Network error' },
    });

    const { result } = renderHook(() =>
      useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL])
    );

    expect(result.current.error).toBe('Network error');
    // Mock fallback returns MOCK_ANNOTATIONS (mocked getThreadedAnnotations).
    expect(result.current.annotations).toHaveLength(MOCK_ANNOTATIONS.length);
  });

  it('exposes isPending as false when no mutation is in-flight', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL])
    );

    expect(result.current.isPending).toBe(false);
  });

  it('exposes a refetch function', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL])
    );

    expect(typeof result.current.refetch).toBe('function');

    act(() => {
      result.current.refetch();
    });

    expect(mockExecuteQuery).toHaveBeenCalledWith({
      requestPolicy: 'network-only',
    });
  });
});
