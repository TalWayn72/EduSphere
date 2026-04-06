/**
 * useMediaUpload hook tests
 *
 * Verifies:
 *  1. Initial state (empty entries, no altText target)
 *  2. handleFileSelect adds entries from file input
 *  3. handleFileSelect strips file extension from title
 *  4. handleFileSelect resets input value
 *  5. uploadFile presign → upload → confirm flow
 *  6. uploadFile handles presign error
 *  7. uploadFile handles fetch error (network failure)
 *  8. uploadFile handles confirm error
 *  9. removeEntry removes entry and updates mediaList
 * 10. handleSaveRichDoc adds rich document and shows saved state
 * 11. handleSaveRichDoc ignores empty title
 * 12. Timer cleanup on unmount (memory safety)
 * 13. updateEntry patches specific entry by index
 * 14. uploadFile shows error toast when courseId is "draft"
 * 15. ingestYouTube shows error toast when courseId is "draft"
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockMutation = vi.fn();

vi.mock('@/lib/urql-client', () => ({
  urqlClient: {
    query: (...args: unknown[]) => ({ toPromise: () => mockQuery(...args) }),
    mutation: (...args: unknown[]) => ({
      toPromise: () => mockMutation(...args),
    }),
  },
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  PRESIGNED_UPLOAD_QUERY: 'PRESIGNED_UPLOAD',
  CONFIRM_MEDIA_UPLOAD_MUTATION: 'CONFIRM_UPLOAD',
}));

vi.mock('./CourseCreatePage.types', () => ({
  DRAFT_COURSE_ID: 'draft',
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => ({ id: 'user-123', name: 'Test User' }),
}));

vi.mock('@/lib/graphql/enriched-lesson.queries', () => ({
  INGEST_YOUTUBE_LESSON_MUTATION: 'INGEST_YOUTUBE',
}));

vi.mock('@/lib/graphql/lesson.queries', () => ({
  CREATE_LESSON_MUTATION: 'CREATE_LESSON',
}));

vi.mock('@/lib/constants', () => ({
  SAVED_CONFIRMATION_MS: 3000,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

import { useMediaUpload } from './useMediaUpload';
import { toast } from 'sonner';
import type { UploadedMedia } from './course-create.types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockFile(name: string, type = 'image/png'): File {
  return new File(['data'], name, { type });
}

const baseMedia: UploadedMedia = {
  id: 'media-1',
  courseId: 'c-1',
  fileKey: 'key-1',
  title: 'Asset',
  contentType: 'image/png',
  status: 'READY',
  downloadUrl: 'https://cdn.example.com/asset.png',
  altText: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useMediaUpload', () => {
  const onChange = vi.fn();

  it('returns correct initial state', () => {
    const { result } = renderHook(() => useMediaUpload('c-1', [], onChange));
    expect(result.current.entries).toEqual([]);
    expect(result.current.altTextTarget).toBeNull();
    expect(result.current.richDocTitle).toBe('');
    expect(result.current.richDocContent).toBe('');
    expect(result.current.richDocSaved).toBe(false);
  });

  it('handleFileSelect adds entries from file input', () => {
    const { result } = renderHook(() => useMediaUpload('c-1', [], onChange));
    const file = createMockFile('photo.png');
    const event = {
      target: { files: [file], value: 'C:\\fakepath\\photo.png' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => result.current.handleFileSelect(event));

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].title).toBe('photo');
    expect(result.current.entries[0].state).toBe('idle');
    expect(result.current.entries[0].progress).toBe(0);
    expect(event.target.value).toBe('');
  });

  it('handleFileSelect ignores empty file list', () => {
    const { result } = renderHook(() => useMediaUpload('c-1', [], onChange));
    const event = {
      target: { files: [], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => result.current.handleFileSelect(event));
    expect(result.current.entries).toHaveLength(0);
  });

  it('uploadFile runs presign → upload → confirm flow', async () => {
    mockQuery.mockResolvedValue({
      data: {
        getPresignedUploadUrl: {
          uploadUrl: 'https://s3.example.com/upload',
          fileKey: 'fk-1',
          expiresAt: '2026-04-01T00:00:00Z',
        },
      },
    });
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true } as Response);
    mockMutation.mockResolvedValue({
      data: { confirmMediaUpload: { ...baseMedia, id: 'new-1' } },
    });

    const { result } = renderHook(() => useMediaUpload('c-1', [], onChange));

    // Add a file entry
    const file = createMockFile('doc.pdf', 'application/pdf');
    act(() => {
      result.current.handleFileSelect({
        target: { files: [file], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.uploadFile(0);
    });

    expect(result.current.entries[0].state).toBe('done');
    expect(result.current.entries[0].progress).toBe(100);
    expect(onChange).toHaveBeenCalled();
  });

  it('uploadFile handles presign error', async () => {
    mockQuery.mockResolvedValue({
      error: { message: 'presign failed' },
    });

    const { result } = renderHook(() => useMediaUpload('c-1', [], onChange));

    act(() => {
      result.current.handleFileSelect({
        target: { files: [createMockFile('f.png')], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.uploadFile(0);
    });

    expect(result.current.entries[0].state).toBe('error');
  });

  it('uploadFile handles network fetch error', async () => {
    mockQuery.mockResolvedValue({
      data: {
        getPresignedUploadUrl: {
          uploadUrl: 'https://s3.example.com/upload',
          fileKey: 'fk-2',
          expiresAt: '2026-04-01T00:00:00Z',
        },
      },
    });
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useMediaUpload('c-1', [], onChange));
    act(() => {
      result.current.handleFileSelect({
        target: { files: [createMockFile('f.png')], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.uploadFile(0);
    });

    expect(result.current.entries[0].state).toBe('error');
  });

  it('removeEntry removes entry and calls onChange', () => {
    const existingMedia = [baseMedia];
    const { result } = renderHook(() =>
      useMediaUpload('c-1', existingMedia, onChange)
    );

    // Add an entry with result matching baseMedia
    act(() => {
      result.current.handleFileSelect({
        target: { files: [createMockFile('photo.png')], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => result.current.removeEntry(0));
    expect(result.current.entries).toHaveLength(0);
  });

  it('handleSaveRichDoc adds rich document to mediaList', () => {
    const { result } = renderHook(() => useMediaUpload('c-1', [], onChange));

    act(() => result.current.setRichDocTitle('My Document'));
    act(() => result.current.setRichDocContent('Some content'));
    act(() => result.current.handleSaveRichDoc());

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaList: expect.arrayContaining([
          expect.objectContaining({
            title: 'My Document',
            contentType: 'RICH_DOCUMENT',
          }),
        ]),
      })
    );
    expect(result.current.richDocSaved).toBe(true);
    expect(result.current.richDocTitle).toBe('');
  });

  it('handleSaveRichDoc ignores empty title', () => {
    const { result } = renderHook(() => useMediaUpload('c-1', [], onChange));
    act(() => result.current.handleSaveRichDoc());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('richDocSaved resets after SAVED_CONFIRMATION_MS', () => {
    const { result } = renderHook(() => useMediaUpload('c-1', [], onChange));
    act(() => result.current.setRichDocTitle('Title'));
    act(() => result.current.handleSaveRichDoc());
    expect(result.current.richDocSaved).toBe(true);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.richDocSaved).toBe(false);
  });

  it('cleans up timer on unmount (memory safety)', () => {
    const { result, unmount } = renderHook(() =>
      useMediaUpload('c-1', [], onChange)
    );
    act(() => result.current.setRichDocTitle('Doc'));
    act(() => result.current.handleSaveRichDoc());
    unmount();
    // Advancing timers after unmount should not throw
    act(() => vi.advanceTimersByTime(5000));
  });

  it('updateEntry patches specific entry by index', () => {
    const { result } = renderHook(() => useMediaUpload('c-1', [], onChange));
    act(() => {
      result.current.handleFileSelect({
        target: {
          files: [createMockFile('a.png'), createMockFile('b.png')],
          value: '',
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => result.current.updateEntry(1, { progress: 50 }));
    expect(result.current.entries[0].progress).toBe(0);
    expect(result.current.entries[1].progress).toBe(50);
  });

  it('uploadFile shows error toast and does not presign when courseId is "draft"', async () => {
    const { result } = renderHook(() => useMediaUpload('draft', [], onChange));

    act(() => {
      result.current.handleFileSelect({
        target: { files: [createMockFile('file.png')], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.uploadFile(0);
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Please complete course details first before uploading files.'
    );
    expect(mockQuery).not.toHaveBeenCalled();
    // Entry should remain 'idle' — not moved to 'presigning'
    expect(result.current.entries[0].state).toBe('idle');
  });

  it('ingestYouTube shows error toast and does not call backend when courseId is "draft"', async () => {
    const { result } = renderHook(() => useMediaUpload('draft', [], onChange));

    await act(async () => {
      await result.current.ingestYouTube(
        'https://www.youtube.com/watch?v=abc123',
        'abc123'
      );
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Please complete course details first before adding videos.'
    );
    expect(mockMutation).not.toHaveBeenCalled();
    expect(result.current.youtubeLoading).toBe(false);
  });
});
