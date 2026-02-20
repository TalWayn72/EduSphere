/**
 * useAnnotations hook tests
 *
 * Verifies:
 *  1. Returns server annotations mapped through normaliseAnnotation
 *  2. addAnnotation immediately adds an optimistic entry (id starts with "local-")
 *  3. addReply immediately adds an optimistic reply entry
 *  4. Falls back to mock data when the query errors
 *  5. isPending reflects transition state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AnnotationLayer } from '@/types/annotations';

// ── urql mock ────────────────────────────────────────────────────────────────
// We fully mock urql so no real network calls are made.

const mockCreateAnnotation = vi.fn().mockResolvedValue({ data: null, error: null });
const mockReplyToAnnotation = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('urql', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

// ── graphql query mocks ───────────────────────────────────────────────────────
vi.mock('@/lib/graphql/annotation.queries', () => ({
  ANNOTATIONS_QUERY: 'ANNOTATIONS_QUERY',
  CREATE_ANNOTATION_MUTATION: 'CREATE_ANNOTATION_MUTATION',
  REPLY_TO_ANNOTATION_MUTATION: 'REPLY_TO_ANNOTATION_MUTATION',
  ANNOTATION_ADDED_SUBSCRIPTION: 'ANNOTATION_ADDED_SUBSCRIPTION',
}));

// ── content-viewer utils mock ─────────────────────────────────────────────────
vi.mock('@/pages/content-viewer.utils', () => ({
  formatTime: (t: number) => `${t}s`,
}));

// ── mock-annotations mock ─────────────────────────────────────────────────────
vi.mock('@/lib/mock-annotations', () => ({
  getThreadedAnnotations: () => [],
  filterAnnotationsByLayers: <T>(items: T[], _layers: unknown[]) => items,
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { useAnnotations } from './useAnnotations';
import * as urql from 'urql';

// ── Helper to configure urql mock state ──────────────────────────────────────

const SERVER_ANNOTATION = {
  id: 'ann-server-1',
  layer: AnnotationLayer.PERSONAL,
  content: 'Server annotation',
  timestampStart: 10,
  userId: 'user-server',
  user: { id: 'user-server', displayName: 'Server User' },
  replies: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

type UrqlMockOptions = {
  queryData?: { annotations: typeof SERVER_ANNOTATION[] } | null;
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
    vi.fn(),
  ] as ReturnType<typeof urql.useQuery>);

  // Map mutation document strings to their respective mock functions.
  vi.mocked(urql.useMutation).mockImplementation((mutation) => {
    if (mutation === 'CREATE_ANNOTATION_MUTATION') {
      return [{ fetching: false }, mockCreateAnnotation] as ReturnType<typeof urql.useMutation>;
    }
    return [{ fetching: false }, mockReplyToAnnotation] as ReturnType<typeof urql.useMutation>;
  });

  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: null, fetching: false },
    vi.fn(),
  ] as ReturnType<typeof urql.useSubscription>);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAnnotations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns normalised server annotations', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations('content-1', [AnnotationLayer.PERSONAL])
    );

    expect(result.current.annotations).toHaveLength(1);
    expect(result.current.annotations[0]?.id).toBe('ann-server-1');
    expect(result.current.annotations[0]?.userName).toBe('Server User');
    expect(result.current.annotations[0]?.timestamp).toBe('10s');
    expect(result.current.fetching).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('adds an optimistic annotation immediately when addAnnotation is called', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations('content-1', [AnnotationLayer.PERSONAL])
    );

    act(() => {
      result.current.addAnnotation('My optimistic note', AnnotationLayer.PERSONAL, 42);
    });

    // The optimistic entry should appear immediately
    const ids = result.current.annotations.map((a) => a.id);
    const hasOptimistic = ids.some((id) => id.startsWith('local-'));
    expect(hasOptimistic).toBe(true);
  });

  it('optimistic annotation has the correct content and layer', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations('content-1', [AnnotationLayer.SHARED])
    );

    act(() => {
      result.current.addAnnotation('Shared thought', AnnotationLayer.SHARED, 5);
    });

    const optimistic = result.current.annotations.find((a) =>
      a.id.startsWith('local-')
    );
    expect(optimistic?.content).toBe('Shared thought');
    expect(optimistic?.layer).toBe(AnnotationLayer.SHARED);
    expect(optimistic?.userName).toBe('You');
    expect(optimistic?.contentTimestamp).toBe(5);
  });

  it('adds an optimistic reply when addReply is called', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations('content-1', [AnnotationLayer.PERSONAL])
    );

    act(() => {
      result.current.addReply('ann-server-1', 'My reply', AnnotationLayer.PERSONAL, 0);
    });

    const replyIds = result.current.annotations.map((a) => a.id);
    expect(replyIds.some((id) => id.startsWith('local-reply-'))).toBe(true);
  });

  it('sets parentId on optimistic reply', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations('content-1', [AnnotationLayer.PERSONAL])
    );

    act(() => {
      result.current.addReply('ann-server-1', 'Reply text', AnnotationLayer.PERSONAL, 0);
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
      useAnnotations('content-1', [AnnotationLayer.PERSONAL])
    );

    // filterAnnotationsByLayers returns input unchanged (mocked above)
    expect(result.current.error).toBe('Network error');
    // Falls back to getThreadedAnnotations() which returns []
    expect(result.current.annotations).toEqual([]);
  });

  it('exposes isPending from useTransition', () => {
    setupUrqlMocks();
    const { result } = renderHook(() =>
      useAnnotations('content-1', [AnnotationLayer.PERSONAL])
    );

    // Before any transition: isPending is false
    expect(result.current.isPending).toBe(false);
  });
});
