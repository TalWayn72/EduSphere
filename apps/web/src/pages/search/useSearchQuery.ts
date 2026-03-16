import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { SEARCH_SEMANTIC_QUERY } from '@/lib/graphql/knowledge.queries';
import { SEARCH_COURSES_QUERY } from '@/lib/graphql/content.queries';
import { DEV_MODE } from '@/lib/auth';
import { mockSearch, formatTime } from './search.utils';
import type { ResultType, SearchResult } from './search.types';

export function useSearchQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [inputValue, setInputValue] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Mounted guard for urql
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // GraphQL semantic search (real mode)
  const [searchResult] = useQuery({
    query: SEARCH_SEMANTIC_QUERY,
    variables: { query, limit: 20 },
    pause: DEV_MODE || query.length < 2,
  });

  // Real course search
  const [courseSearchResult] = useQuery({
    query: SEARCH_COURSES_QUERY,
    variables: { query, limit: 20 },
    pause: query.length < 2,
  });

  // Debounce input
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (inputValue.trim().length >= 2) {
      setIsSearching(true);
      debounceRef.current = setTimeout(() => {
        setQuery(inputValue);
        setSearchParams({ q: inputValue }, { replace: true });
        setIsSearching(false);
      }, 300);
    } else {
      setQuery('');
      setSearchParams({}, { replace: true });
      setIsSearching(false);
    }
    return () => clearTimeout(debounceRef.current);
  }, [inputValue, setSearchParams]);

  // Log course search errors
  useEffect(() => {
    if (courseSearchResult.error) {
      console.error('[Search] Course search failed:', courseSearchResult.error.message);
    }
  }, [courseSearchResult.error]);

  // Map SemanticResult -> SearchResult
  const realResults: SearchResult[] = (
    (searchResult.data?.searchSemantic ?? []) as Array<{
      id: string;
      text: string;
      similarity: number;
      entityType: string;
      entityId: string;
      startTime: number | null;
    }>
  ).map((r) => {
    const isConceptType = r.entityType === 'concept';
    const type: ResultType = isConceptType ? 'concept' : 'transcript';
    const timestampParam =
      !isConceptType && r.startTime != null ? `?t=${Math.floor(r.startTime)}` : '';
    return {
      id: r.id,
      type,
      title: isConceptType
        ? (r.text.split('\n')[0]?.slice(0, 80) ?? r.entityType)
        : query,
      snippet: r.text,
      meta: !isConceptType && r.startTime != null
        ? formatTime(r.startTime)
        : `${Math.round(r.similarity * 100)}% match`,
      timestamp: r.startTime ?? undefined,
      href: isConceptType ? '/graph' : `/learn/${r.entityId}${timestampParam}`,
    };
  });

  // Offline fallback detection
  const isOfflineFallback =
    !DEV_MODE && !!searchResult.error && query.length >= 2;

  // Real course results
  const courseResults: SearchResult[] = (
    (courseSearchResult.data?.searchCourses ?? []) as Array<{
      id: string;
      title: string;
      description: string | null;
      slug: string;
      isPublished: boolean;
      estimatedHours: number | null;
      thumbnailUrl: string | null;
    }>
  ).map((c) => ({
    id: `course-${c.id}`,
    type: 'course' as const,
    title: c.title,
    snippet: c.description ?? `Course: ${c.title}`,
    meta: c.estimatedHours ? `${c.estimatedHours}h` : undefined,
    href: `/courses/${c.id}`,
  }));

  // Non-course results: semantic (real) or mock (fallback/dev)
  const nonCourseResults: SearchResult[] = DEV_MODE
    ? mockSearch(query).filter((r) => r.type !== 'course')
    : isOfflineFallback
      ? mockSearch(query).filter((r) => r.type !== 'course')
      : realResults;

  const results: SearchResult[] = [...courseResults, ...nonCourseResults];

  const loading = (!DEV_MODE && searchResult.fetching) || courseSearchResult.fetching || isSearching;

  return {
    inputValue,
    setInputValue,
    query,
    results,
    loading,
    isOfflineFallback,
    mounted,
  };
}
