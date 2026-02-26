import { useState, useCallback } from 'react';

const STORAGE_KEY = 'edusphere:agent:history:v1';
const MAX_ENTRIES = 20;

export interface AgentHistoryEntry {
  id: string;
  contentId: string;
  firstUserMessage: string;
  messageCount: number;
  lastMessageAt: string; // ISO date
}

function loadHistory(): AgentHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AgentHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function useAgentHistory() {
  const [history, setHistory] = useState<AgentHistoryEntry[]>(loadHistory);

  const addSession = useCallback((entry: AgentHistoryEntry) => {
    setHistory((prev) => {
      // Remove duplicate id then prepend; guard max size to avoid unbounded growth.
      const next = [entry, ...prev.filter((e) => e.id !== entry.id)].slice(
        0,
        MAX_ENTRIES
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota exceeded — silently skip persistence */
      }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  return { history, addSession, clearHistory };
}
