import { useState, useCallback } from 'react';

const STORAGE_KEY = 'edusphere-recent-documents';
const MAX_ITEMS = 10;

export interface RecentDocument {
  contentId: string;
  title: string;
  lastViewedAt: string;
}

function readList(): RecentDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentDocument[];
  } catch {
    return [];
  }
}

function writeList(list: RecentDocument[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function useRecentDocuments() {
  const [recentDocuments, setRecentDocuments] =
    useState<RecentDocument[]>(readList);

  const addRecentDocument = useCallback((contentId: string, title: string) => {
    setRecentDocuments((prev) => {
      const filtered = prev.filter((d) => d.contentId !== contentId);
      const updated: RecentDocument[] = [
        { contentId, title, lastViewedAt: new Date().toISOString() },
        ...filtered,
      ].slice(0, MAX_ITEMS);
      writeList(updated);
      return updated;
    });
  }, []);

  return { recentDocuments, addRecentDocument };
}
