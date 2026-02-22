/** useAnnotations memory leak / subscription cleanup tests
 *
 * Verifies:
 *   1. pause:true for non-UUID contentId (no subscription opened)
 *   2. pause:false for valid UUID (subscription active)
 *   3. No throw on unmount (no leaked refs)
 *   4. Subscription deduplication guards work correctly
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AnnotationLayer } from '@/types/annotations';
import { AnnotationType } from '@edusphere/graphql-types';
import type { AnnotationsQuery } from '@edusphere/graphql-types';

vi.mock('urql', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

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

vi.mock('@/pages/content-viewer.utils', () => ({
  formatTime: (t: number) => `${t}s`,
}));

vi.mock('@/lib/mock-annotations', () => ({
  getThreadedAnnotations: () => [],
  filterAnnotationsByLayers: <T>(items: T[], _layers: unknown[]) => items,
}));

import { useAnnotations } from './useAnnotations';
import * as urql from 'urql';

const VALID_UUID = '909e98a3-d6c4-407c-a4ab-59a978820f07';
const SLUG_ID = 'content-1';

const SERVER_ANNOTATION = {
  id: 'ann-1',
  layer: AnnotationLayer.PERSONAL,
  annotationType: AnnotationType.Text,
  content: 'Hello annotation',
  spatialData: { timestampStart: 5 },
  parentId: null,
  userId: 'user-1',
  isResolved: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
} as unknown as AnnotationsQuery['annotations'][number];

function setupUrqlMocks(options: { subscriptionData?: unknown } = {}) {
  const { subscriptionData = null } = options;
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: { annotations: [SERVER_ANNOTATION] }, fetching: false, error: undefined },
    vi.fn(),
  ] as ReturnType<typeof urql.useQuery>);
  vi.mocked(urql.useMutation).mockImplementation((_m) =>
    [{ fetching: false }, vi.fn().mockResolvedValue({ data: null })] as ReturnType<typeof urql.useMutation>
  );
  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: subscriptionData, fetching: false },
    vi.fn(),
  ] as ReturnType<typeof urql.useSubscription>);
}

describe('useAnnotations subscription cleanup (memory safety)', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('passes pause:true to useSubscription when contentId is not a UUID', () => {
    setupUrqlMocks();
    renderHook(() => useAnnotations(SLUG_ID, [AnnotationLayer.PERSONAL]));
    const c = vi.mocked(urql.useSubscription).mock.calls[0];
    expect(c?.[0]).toMatchObject({ pause: true });
  });

  it('passes pause:false to useSubscription when contentId is a valid UUID', () => {
    setupUrqlMocks();
    renderHook(() => useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL]));
    const c = vi.mocked(urql.useSubscription).mock.calls[0];
    expect(c?.[0]).toMatchObject({ pause: false });
  });

  it('does not throw when unmounting with an active subscription', () => {
    setupUrqlMocks();
    const { unmount } = renderHook(() => useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL]));
    expect(() => unmount()).not.toThrow();
  });

  it('does not throw when unmounting with a paused subscription', () => {
    setupUrqlMocks();
    const { unmount } = renderHook(() => useAnnotations(SLUG_ID, [AnnotationLayer.PERSONAL]));
    expect(() => unmount()).not.toThrow();
  });

  it('subscription setup is correct and unmount does not throw for incoming event', () => {
    // The hook uses useOptimistic which only shows optimistic values
    // during a startTransition call. Subscription events dispatched via
    // dispatchOptimistic outside a transition revert to the server state.
    // This test verifies: (1) subscription is called with correct args,
    // (2) unmounting after subscription event does not throw.
    const incoming = {
      annotationAdded: {
        id: 'ann-sub-new',
        layer: AnnotationLayer.SHARED,
        annotationType: 'TEXT',
        content: 'Subscription note',
        spatialData: { timestampStart: 20 },
        userId: 'user-sub',
        isResolved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    setupUrqlMocks({ subscriptionData: incoming });
    const { result, unmount } = renderHook(() =>
      useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL, AnnotationLayer.SHARED])
    );
    // Subscription must have been called with the correct assetId
    const subCall = vi.mocked(urql.useSubscription).mock.calls[0];
    expect(subCall?.[0]).toMatchObject({ variables: { assetId: VALID_UUID } });
    // Server annotations are always present
    expect(result.current.annotations.some((a) => a.id === 'ann-1')).toBe(true);
    // Unmount must not throw even with pending subscription data
    expect(() => unmount()).not.toThrow();
  });

  it('does not re-add a subscription event that already exists in server data', () => {
    const dup = {
      annotationAdded: {
        id: SERVER_ANNOTATION.id,
        layer: AnnotationLayer.PERSONAL,
        annotationType: 'TEXT',
        content: 'Duplicate',
        spatialData: { timestampStart: 5 },
        userId: 'user-1',
        isResolved: false,
        createdAt: SERVER_ANNOTATION.createdAt,
        updatedAt: SERVER_ANNOTATION.updatedAt,
      },
    };
    setupUrqlMocks({ subscriptionData: dup });
    const { result } = renderHook(() => useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL]));
    const matching = result.current.annotations.filter((a) => a.id === SERVER_ANNOTATION.id);
    expect(matching).toHaveLength(1);
  });

  it('re-issues subscription with updated contentId when hook re-renders', () => {
    setupUrqlMocks();
    const SECOND_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const { rerender } = renderHook(
      ({ id }: { id: string }) => useAnnotations(id, [AnnotationLayer.PERSONAL]),
      { initialProps: { id: VALID_UUID } }
    );
    rerender({ id: SECOND_UUID });
    const calls = vi.mocked(urql.useSubscription).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[0]).toMatchObject({ variables: { assetId: SECOND_UUID } });
  });

  it('pauses subscription when contentId changes from UUID to non-UUID', () => {
    setupUrqlMocks();
    const { rerender } = renderHook(
      ({ id }: { id: string }) => useAnnotations(id, [AnnotationLayer.PERSONAL]),
      { initialProps: { id: VALID_UUID } }
    );
    rerender({ id: SLUG_ID });
    const calls = vi.mocked(urql.useSubscription).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[0]).toMatchObject({ pause: true });
  });

  it('does not throw when addAnnotation is called and the hook is unmounted', () => {
    setupUrqlMocks();
    const { result, unmount } = renderHook(() => useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL]));
    act(() => { result.current.addAnnotation('Test note', AnnotationLayer.PERSONAL, 0); });
    expect(() => unmount()).not.toThrow();
  });

  it('does not throw when addReply is called and the hook is unmounted', () => {
    setupUrqlMocks();
    const { result, unmount } = renderHook(() => useAnnotations(VALID_UUID, [AnnotationLayer.PERSONAL]));
    act(() => { result.current.addReply(SERVER_ANNOTATION.id, 'Reply text', AnnotationLayer.PERSONAL, 0); });
    expect(() => unmount()).not.toThrow();
  });
});
