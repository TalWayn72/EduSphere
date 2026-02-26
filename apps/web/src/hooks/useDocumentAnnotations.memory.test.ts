/**
 * Memory safety tests for useDocumentAnnotations.
 *
 * Verifies that:
 * - The hook delegates query + subscription to useAnnotations (no second urql subscription).
 * - Unmounting does not throw.
 * - The hook is resilient to edge-case inputs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { AnnotationLayer } from '@/types/annotations';
import type { Annotation } from '@/types/annotations';

// ── Mock urql useMutation ────────────────────────────────────────────────────
vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{}, vi.fn().mockResolvedValue({ data: null, error: null })]),
}));

// ── Mock useAnnotations ──────────────────────────────────────────────────────
vi.mock('@/hooks/useAnnotations', () => ({
  useAnnotations: vi.fn().mockReturnValue({
    annotations: [],
    addAnnotation: vi.fn(),
    addReply: vi.fn(),
    fetching: false,
    isPending: false,
    error: null,
  }),
}));

// ── Mock useUIStore ──────────────────────────────────────────────────────────
vi.mock('@/lib/store', () => ({
  useUIStore: vi.fn().mockReturnValue({
    sidebarOpen: true,
    activeAnnotationId: null,
    agentChatOpen: false,
    focusedAnnotationId: null,
    setSidebarOpen: vi.fn(),
    setActiveAnnotationId: vi.fn(),
    setAgentChatOpen: vi.fn(),
    setFocusedAnnotationId: vi.fn(),
  }),
  useDocumentUIStore: vi.fn(() => ({
    documentZoom: 1 as const,
    setDocumentZoom: vi.fn(),
    annotationPanelWidth: 35,
    setAnnotationPanelWidth: vi.fn(),
  })),
}));

// ── Mock annotation.mutations ─────────────────────────────────────────────────
vi.mock('@/lib/graphql/annotation.mutations', () => ({
  CREATE_ANNOTATION_MUTATION: 'CREATE_ANNOTATION_MUTATION',
  UPDATE_ANNOTATION_MUTATION: 'UPDATE_ANNOTATION_MUTATION',
  DELETE_ANNOTATION_MUTATION: 'DELETE_ANNOTATION_MUTATION',
  ANNOTATIONS_BY_ASSET_QUERY: 'ANNOTATIONS_BY_ASSET_QUERY',
  ANNOTATION_ADDED_SUBSCRIPTION: 'ANNOTATION_ADDED_SUBSCRIPTION',
}));

import { useDocumentAnnotations } from '@/hooks/useDocumentAnnotations';
import { useAnnotations } from '@/hooks/useAnnotations';

describe('useDocumentAnnotations — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAnnotations).mockReturnValue({
      annotations: [],
      addAnnotation: vi.fn(),
      addReply: vi.fn(),
      fetching: false,
      isPending: false,
      error: null,
    });
  });

  it('unmount does not throw', () => {
    const { unmount } = renderHook(() => useDocumentAnnotations('doc-1'));
    expect(() => unmount()).not.toThrow();
  });

  it('delegates to useAnnotations — no second subscription created', () => {
    renderHook(() => useDocumentAnnotations('doc-1'));
    // useAnnotations owns the single subscription; this hook must not create another.
    expect(vi.mocked(useAnnotations)).toHaveBeenCalledTimes(1);
  });

  it('handles non-UUID contentId without throwing', () => {
    expect(() => {
      renderHook(() => useDocumentAnnotations('not-a-uuid'));
    }).not.toThrow();
  });

  it('handles empty string contentId without throwing', () => {
    expect(() => {
      renderHook(() => useDocumentAnnotations(''));
    }).not.toThrow();
  });

  it('textAnnotations and allAnnotations are empty when no textRange annotations exist', () => {
    const videoOnlyAnnotation: Annotation = {
      id: 'vid-ann',
      content: 'video only',
      layer: AnnotationLayer.PERSONAL,
      userId: 'u1',
      userName: 'User',
      userRole: 'student',
      timestamp: '0:30',
      contentId: 'doc-1',
      contentTimestamp: 30,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      replies: [],
    };
    vi.mocked(useAnnotations).mockReturnValue({
      annotations: [videoOnlyAnnotation],
      addAnnotation: vi.fn(),
      addReply: vi.fn(),
      fetching: false,
      isPending: false,
      error: null,
    });
    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    expect(result.current.textAnnotations).toHaveLength(0);
    expect(result.current.allAnnotations).toHaveLength(0);
  });

  it('re-renders do not accumulate extra useAnnotations calls', () => {
    const { rerender } = renderHook(() => useDocumentAnnotations('doc-1'));
    rerender();
    rerender();
    // Each render calls useAnnotations once — total 3 across 3 renders.
    expect(vi.mocked(useAnnotations)).toHaveBeenCalledTimes(3);
  });

  it('changing contentId passes the new id to useAnnotations', () => {
    const { rerender } = renderHook(
      ({ id }: { id: string }) => useDocumentAnnotations(id),
      { initialProps: { id: 'doc-a' } },
    );
    rerender({ id: 'doc-b' });
    const calls = vi.mocked(useAnnotations).mock.calls;
    expect(calls[0][0]).toBe('doc-a');
    expect(calls[1][0]).toBe('doc-b');
  });

  it('addTextAnnotation returning a rejected promise does not crash the hook', async () => {
    const { useMutation } = await import('urql');
    vi.mocked(useMutation).mockReturnValue([
      {},
      vi.fn().mockRejectedValue(new Error('Network error')),
    ] as ReturnType<typeof useMutation>);

    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));

    // The hook itself must not crash; callers handle the rejection.
    await expect(
      result.current.addTextAnnotation({
        text: 'fail',
        layer: AnnotationLayer.PERSONAL,
        from: 0,
        to: 10,
      }),
    ).rejects.toThrow('Network error');
  });
});
