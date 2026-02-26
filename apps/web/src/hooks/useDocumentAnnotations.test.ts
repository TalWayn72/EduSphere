import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AnnotationLayer } from '@/types/annotations';
import type { Annotation } from '@/types/annotations';

// ── Mock urql useMutation ────────────────────────────────────────────────────
const mockCreateAnnotation = vi
  .fn()
  .mockResolvedValue({ data: null, error: null });

vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{}, mockCreateAnnotation]),
}));

// ── Mock useAnnotations ──────────────────────────────────────────────────────
vi.mock('@/hooks/useAnnotations', () => ({
  useAnnotations: vi.fn(),
}));

// ── Mock useUIStore ──────────────────────────────────────────────────────────
const mockSetFocusedAnnotationId = vi.fn();

vi.mock('@/lib/store', () => ({
  useUIStore: vi.fn(),
  useDocumentUIStore: vi.fn(() => ({
    documentZoom: 1 as const,
    setDocumentZoom: vi.fn(),
    annotationPanelWidth: 35,
    setAnnotationPanelWidth: vi.fn(),
  })),
}));

// ── Mock annotation.mutations (gql tag) ──────────────────────────────────────
vi.mock('@/lib/graphql/annotation.mutations', () => ({
  CREATE_ANNOTATION_MUTATION: 'CREATE_ANNOTATION_MUTATION',
  UPDATE_ANNOTATION_MUTATION: 'UPDATE_ANNOTATION_MUTATION',
  DELETE_ANNOTATION_MUTATION: 'DELETE_ANNOTATION_MUTATION',
  ANNOTATIONS_BY_ASSET_QUERY: 'ANNOTATIONS_BY_ASSET_QUERY',
  ANNOTATION_ADDED_SUBSCRIPTION: 'ANNOTATION_ADDED_SUBSCRIPTION',
}));

import { useDocumentAnnotations } from '@/hooks/useDocumentAnnotations';
import { useAnnotations } from '@/hooks/useAnnotations';
import { useUIStore } from '@/lib/store';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_ANNOTATION: Omit<
  Annotation,
  'id' | 'layer' | 'textRange' | 'contentTimestamp'
> = {
  content: 'Test annotation',
  userId: 'user-1',
  userName: 'Alice',
  userRole: 'student',
  timestamp: '0:00',
  contentId: 'doc-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  replies: [],
};

const mockAnnotations: Annotation[] = [
  {
    ...BASE_ANNOTATION,
    id: 'ann-1',
    layer: AnnotationLayer.PERSONAL,
    textRange: { from: 10, to: 50 },
  },
  {
    // No textRange — video-only annotation, must be excluded.
    ...BASE_ANNOTATION,
    id: 'ann-2',
    layer: AnnotationLayer.SHARED,
    userId: 'user-2',
    userName: 'Bob',
    userRole: 'instructor',
    contentTimestamp: 42,
  },
  {
    ...BASE_ANNOTATION,
    id: 'ann-3',
    layer: AnnotationLayer.INSTRUCTOR,
    textRange: { from: 5, to: 8 },
  },
];

function makeUIStore(overrides: Partial<ReturnType<typeof useUIStore>> = {}) {
  return {
    sidebarOpen: true,
    activeAnnotationId: null,
    agentChatOpen: false,
    focusedAnnotationId: null,
    setSidebarOpen: vi.fn(),
    setActiveAnnotationId: vi.fn(),
    setAgentChatOpen: vi.fn(),
    setFocusedAnnotationId: mockSetFocusedAnnotationId,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useDocumentAnnotations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAnnotations).mockReturnValue({
      annotations: mockAnnotations,
      addAnnotation: vi.fn(),
      addReply: vi.fn(),
      fetching: false,
      isPending: false,
      error: null,
    });
    vi.mocked(useUIStore).mockReturnValue(makeUIStore());
  });

  it('filters out annotations without textRange', () => {
    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    expect(result.current.textAnnotations).toHaveLength(2);
    expect(result.current.textAnnotations.map((a) => a.id)).not.toContain(
      'ann-2'
    );
  });

  it('sorts textAnnotations ascending by from position', () => {
    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    const positions = result.current.textAnnotations.map(
      (a) => a.textRange.from
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    // ann-3 (from:5) comes before ann-1 (from:10)
    expect(result.current.textAnnotations[0].id).toBe('ann-3');
    expect(result.current.textAnnotations[1].id).toBe('ann-1');
  });

  it('textAnnotations contain id, layer, and textRange only', () => {
    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    const first = result.current.textAnnotations[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('layer');
    expect(first).toHaveProperty('textRange');
    expect(first).not.toHaveProperty('content');
  });

  it('allAnnotations is sorted ascending by from and excludes video-only annotations', () => {
    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    expect(result.current.allAnnotations).toHaveLength(2);
    const froms = result.current.allAnnotations.map((a) => a.textRange!.from);
    expect(froms).toEqual([...froms].sort((a, b) => a - b));
  });

  it('allAnnotations contain full Annotation objects', () => {
    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    const ann = result.current.allAnnotations[0];
    expect(ann).toHaveProperty('content');
    expect(ann).toHaveProperty('userId');
    expect(ann).toHaveProperty('createdAt');
  });

  it('exposes focusedAnnotationId from UIStore', () => {
    vi.mocked(useUIStore).mockReturnValue(
      makeUIStore({ focusedAnnotationId: 'ann-1' })
    );
    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    expect(result.current.focusedAnnotationId).toBe('ann-1');
  });

  it('setFocusedAnnotationId is forwarded from UIStore', () => {
    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    act(() => {
      result.current.setFocusedAnnotationId('ann-3');
    });
    expect(mockSetFocusedAnnotationId).toHaveBeenCalledWith('ann-3');
  });

  it('addTextAnnotation calls createAnnotation with correct input shape', async () => {
    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    await act(async () => {
      await result.current.addTextAnnotation({
        text: 'My comment',
        layer: AnnotationLayer.PERSONAL,
        from: 10,
        to: 50,
      });
    });
    expect(mockCreateAnnotation).toHaveBeenCalledWith({
      input: {
        assetId: 'doc-1',
        annotationType: 'TEXT',
        content: 'My comment',
        layer: AnnotationLayer.PERSONAL,
        spatialData: { from: 10, to: 50 },
      },
    });
  });

  it('addTextAnnotation passes from/to as spatialData (not timestampStart)', async () => {
    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    await act(async () => {
      await result.current.addTextAnnotation({
        text: 'range',
        layer: AnnotationLayer.SHARED,
        from: 100,
        to: 200,
      });
    });
    const callArg = mockCreateAnnotation.mock.calls[0][0] as {
      input: { spatialData: unknown };
    };
    expect(callArg.input.spatialData).toEqual({ from: 100, to: 200 });
    expect(callArg.input.spatialData).not.toHaveProperty('timestampStart');
  });

  it('passes fetching:true through', () => {
    vi.mocked(useAnnotations).mockReturnValue({
      annotations: [],
      addAnnotation: vi.fn(),
      addReply: vi.fn(),
      fetching: true,
      isPending: false,
      error: null,
    });
    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    expect(result.current.fetching).toBe(true);
  });

  it('passes error string through', () => {
    vi.mocked(useAnnotations).mockReturnValue({
      annotations: [],
      addAnnotation: vi.fn(),
      addReply: vi.fn(),
      fetching: false,
      isPending: false,
      error: 'Network error',
    });
    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    expect(result.current.error).toBe('Network error');
  });

  it('handles spatialData-only textRange (backwards-compat path)', () => {
    const annWithRawSpatialData = {
      ...BASE_ANNOTATION,
      id: 'ann-raw',
      layer: AnnotationLayer.PERSONAL,
      spatialData: { from: 20, to: 40 },
    } as unknown as Annotation;

    vi.mocked(useAnnotations).mockReturnValue({
      annotations: [annWithRawSpatialData],
      addAnnotation: vi.fn(),
      addReply: vi.fn(),
      fetching: false,
      isPending: false,
      error: null,
    });

    const { result } = renderHook(() => useDocumentAnnotations('doc-1'));
    expect(result.current.textAnnotations).toHaveLength(1);
    expect(result.current.textAnnotations[0].textRange).toEqual({
      from: 20,
      to: 40,
    });
  });

  it('delegates to useAnnotations — no second subscription created', () => {
    renderHook(() => useDocumentAnnotations('doc-1'));
    expect(vi.mocked(useAnnotations)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(useAnnotations)).toHaveBeenCalledWith(
      'doc-1',
      expect.arrayContaining([
        AnnotationLayer.PERSONAL,
        AnnotationLayer.SHARED,
        AnnotationLayer.INSTRUCTOR,
        AnnotationLayer.AI_GENERATED,
      ])
    );
  });
});
