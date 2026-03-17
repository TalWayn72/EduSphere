import type { BookOpen } from 'lucide-react';

export type ResultType = 'transcript' | 'annotation' | 'concept' | 'course';

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: string | null;
  createdAt: string;
}

export interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  snippet: string;
  meta?: string;
  timestamp?: number;
  href?: string;
}

export interface TypeConfig {
  icon: typeof BookOpen;
  label: string;
  color: string;
  bg: string;
}
