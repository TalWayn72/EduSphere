import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── localStorage mock (must be defined before hook import) ───────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

// ─── Import hook AFTER mocks ───────────────────────────────────────────────────

import { useRecentDocuments, type RecentDocument } from './useRecentDocuments';

// ─── Constants ────────────────────────────────────────────────────────────────

const RECENT_KEY = 'edusphere-recent-documents';
const MAX_RECENT = 10;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useRecentDocuments', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('getRecentDocuments returns empty array when storage is empty', () => {
    const { result } = renderHook(() => useRecentDocuments());
    const docs = result.current.getRecentDocuments();
    expect(docs).toEqual([]);
  });

  it('addRecentDocument stores a new entry in localStorage', () => {
    const { result } = renderHook(() => useRecentDocuments());

    act(() => {
      result.current.addRecentDocument('content-1', 'Introduction to AI');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      RECENT_KEY,
      expect.stringContaining('"contentId":"content-1"')
    );
  });

  it('getRecentDocuments returns the stored document after addRecentDocument', () => {
    const stored: RecentDocument[] = [
      { contentId: 'c1', title: 'Doc One', lastViewedAt: Date.now() },
    ];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(stored));

    const { result } = renderHook(() => useRecentDocuments());
    const docs = result.current.getRecentDocuments();

    expect(docs).toHaveLength(1);
    expect(docs[0].contentId).toBe('c1');
    expect(docs[0].title).toBe('Doc One');
  });

  it('addRecentDocument deduplicates by contentId (moves to front)', () => {
    const existing: RecentDocument[] = [
      { contentId: 'dup', title: 'Old Title', lastViewedAt: 1000 },
      { contentId: 'other', title: 'Other', lastViewedAt: 2000 },
    ];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(existing));

    const { result } = renderHook(() => useRecentDocuments());

    act(() => {
      result.current.addRecentDocument('dup', 'New Title');
    });

    const written = JSON.parse(
      (localStorageMock.setItem.mock.calls[0] as [string, string])[1]
    ) as RecentDocument[];
    expect(written[0].contentId).toBe('dup');
    expect(written[0].title).toBe('New Title');
    expect(written).toHaveLength(2);
  });

  it('addRecentDocument caps the list at MAX_RECENT (10)', () => {
    const many: RecentDocument[] = Array.from(
      { length: MAX_RECENT },
      (_, i) => ({
        contentId: `c${i}`,
        title: `Doc ${i}`,
        lastViewedAt: Date.now() - i * 1000,
      })
    );
    localStorageMock.getItem.mockReturnValue(JSON.stringify(many));

    const { result } = renderHook(() => useRecentDocuments());

    act(() => {
      result.current.addRecentDocument('c-new', 'New Doc');
    });

    const written = JSON.parse(
      (localStorageMock.setItem.mock.calls[0] as [string, string])[1]
    ) as RecentDocument[];
    expect(written).toHaveLength(MAX_RECENT);
    expect(written[0].contentId).toBe('c-new');
  });

  it('getRecentDocuments returns all stored documents', () => {
    const stored: RecentDocument[] = [
      { contentId: 'a', title: 'A', lastViewedAt: 100 },
      { contentId: 'b', title: 'B', lastViewedAt: 200 },
      { contentId: 'c', title: 'C', lastViewedAt: 300 },
    ];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(stored));

    const { result } = renderHook(() => useRecentDocuments());
    const docs = result.current.getRecentDocuments();

    expect(docs).toHaveLength(3);
    expect(docs.map((d) => d.contentId)).toEqual(['a', 'b', 'c']);
  });

  it('handles JSON parse error gracefully by returning empty array', () => {
    localStorageMock.getItem.mockReturnValue('{ INVALID }}}');

    const { result } = renderHook(() => useRecentDocuments());
    const docs = result.current.getRecentDocuments();

    expect(docs).toEqual([]);
  });

  it('addRecentDocument includes a lastViewedAt timestamp close to now', () => {
    const before = Date.now();
    const { result } = renderHook(() => useRecentDocuments());

    act(() => {
      result.current.addRecentDocument('ts-test', 'Timestamp Test');
    });

    const written = JSON.parse(
      (localStorageMock.setItem.mock.calls[0] as [string, string])[1]
    ) as RecentDocument[];
    const after = Date.now();
    expect(written[0].lastViewedAt).toBeGreaterThanOrEqual(before);
    expect(written[0].lastViewedAt).toBeLessThanOrEqual(after);
  });
});
