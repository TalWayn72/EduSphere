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
    _store: store,
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

// ─── Import hook AFTER mocks ───────────────────────────────────────────────────

import { useAgentHistory, type AgentHistoryEntry } from './useAgentHistory';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'edusphere:agent:history:v1';
const MAX_ENTRIES = 20;

function makeEntry(
  id: string,
  overrides: Partial<AgentHistoryEntry> = {}
): AgentHistoryEntry {
  return {
    id,
    contentId: `content-${id}`,
    firstUserMessage: `Hello from ${id}`,
    messageCount: 1,
    lastMessageAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAgentHistory', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('starts with empty history when localStorage is empty', () => {
    const { result } = renderHook(() => useAgentHistory());
    expect(result.current.history).toEqual([]);
  });

  it('loads existing history from localStorage on init', () => {
    const stored: AgentHistoryEntry[] = [makeEntry('a'), makeEntry('b')];
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(stored));

    const { result } = renderHook(() => useAgentHistory());
    expect(result.current.history).toHaveLength(2);
    expect(result.current.history[0].id).toBe('a');
    expect(result.current.history[1].id).toBe('b');
  });

  it('addSession prepends a new entry to history', () => {
    const { result } = renderHook(() => useAgentHistory());
    const entry = makeEntry('new-1');

    act(() => {
      result.current.addSession(entry);
    });

    expect(result.current.history[0]).toEqual(entry);
  });

  it('addSession deduplicates by id (moves existing entry to front)', () => {
    const entryA = makeEntry('dup');
    const entryB = makeEntry('other');
    const { result } = renderHook(() => useAgentHistory());

    act(() => {
      result.current.addSession(entryB);
    });
    act(() => {
      result.current.addSession(entryA);
    });
    act(() => {
      result.current.addSession({ ...entryA, messageCount: 5 });
    });

    expect(result.current.history).toHaveLength(2);
    expect(result.current.history[0].id).toBe('dup');
    expect(result.current.history[0].messageCount).toBe(5);
  });

  it('addSession caps history at MAX_ENTRIES (20)', () => {
    const { result } = renderHook(() => useAgentHistory());

    act(() => {
      for (let i = 0; i < MAX_ENTRIES + 5; i++) {
        result.current.addSession(makeEntry(`entry-${i}`));
      }
    });

    expect(result.current.history).toHaveLength(MAX_ENTRIES);
  });

  it('addSession persists the updated list to localStorage', () => {
    const { result } = renderHook(() => useAgentHistory());
    const entry = makeEntry('persist-me');

    act(() => {
      result.current.addSession(entry);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify([entry])
    );
  });

  it('clearHistory empties in-memory history', () => {
    const { result } = renderHook(() => useAgentHistory());
    act(() => {
      result.current.addSession(makeEntry('x'));
    });
    expect(result.current.history).toHaveLength(1);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.history).toEqual([]);
  });

  it('clearHistory removes the localStorage key', () => {
    const { result } = renderHook(() => useAgentHistory());
    act(() => {
      result.current.addSession(makeEntry('y'));
    });

    act(() => {
      result.current.clearHistory();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('handles localStorage JSON parse errors gracefully by returning empty history', () => {
    localStorageMock.getItem.mockReturnValueOnce('{ INVALID JSON }}}');

    const { result } = renderHook(() => useAgentHistory());

    expect(result.current.history).toEqual([]);
  });
});
