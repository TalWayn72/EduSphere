import { useCallback } from 'react';

export interface RecentDocument {
  contentId: string;
  title: string;
  lastViewedAt: number; // Unix ms
}

const RECENT_KEY = 'edusphere-recent-documents';
const MAX_RECENT = 10;

function readRecentDocuments(): RecentDocument[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentDocument[]) : [];
  } catch {
    return [];
  }
}

function writeRecentDocuments(docs: RecentDocument[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(docs));
  } catch {
    // Silently ignore storage errors
  }
}

export function useRecentDocuments() {
  const addRecentDocument = useCallback((contentId: string, title: string) => {
    const existing = readRecentDocuments().filter(
      (d) => d.contentId !== contentId
    );
    const updated: RecentDocument[] = [
      { contentId, title, lastViewedAt: Date.now() },
      ...existing,
    ].slice(0, MAX_RECENT);
    writeRecentDocuments(updated);
  }, []);

  const getRecentDocuments = useCallback((): RecentDocument[] => {
    return readRecentDocuments();
  }, []);

  return { addRecentDocument, getRecentDocuments };
}
