import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery } from 'urql';
import {
  COURSES_DISCOVERY_QUERY,
  SEARCH_COURSES_DISCOVERY_QUERY,
} from '@/lib/graphql/courses-discovery.queries';
import { MY_ENROLLMENTS_QUERY } from '@/lib/graphql/content.queries';
import { toDisplayCourse } from './helpers';
import { PAGE_SIZE, type ApiCourse, type DisplayCourse, type SortOption } from './types';

export function useCoursesDiscovery() {
  // Mounted guard -- urql iron rule: pause until mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('Any Level');
  const [selectedSort, setSelectedSort] = useState<SortOption>('popular');
  const [selectedDuration, setSelectedDuration] = useState('Any Duration');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchValue(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setDebouncedSearch(val);
        setVisibleCount(PAGE_SIZE);
      }, 300);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Use search query when text is entered, otherwise use listing query
  const isSearching = debouncedSearch.trim().length > 0;

  const [{ data: listData, fetching: listFetching, error: listError }] =
    useQuery({
      query: COURSES_DISCOVERY_QUERY,
      variables: { limit: 100, offset: 0 },
      pause: !mounted || isSearching,
    });

  const [{ data: searchData, fetching: searchFetching, error: searchError }] =
    useQuery({
      query: SEARCH_COURSES_DISCOVERY_QUERY,
      variables: { query: debouncedSearch, limit: 50 },
      pause: !mounted || !isSearching,
    });

  const [{ data: enrollmentData }] = useQuery({
    query: MY_ENROLLMENTS_QUERY,
    pause: !mounted,
  });

  const enrolledIds = useMemo(
    () =>
      new Set(
        ((enrollmentData?.myEnrollments ?? []) as Array<{ courseId: string }>).map(
          (e) => e.courseId
        )
      ),
    [enrollmentData]
  );

  const fetching = isSearching ? searchFetching : listFetching;
  const error = isSearching ? searchError : listError;

  // Build raw courses list from API data
  const rawCourses: ApiCourse[] = useMemo(() => {
    if (isSearching) {
      return (searchData?.searchCourses ?? []) as ApiCourse[];
    }
    return (listData?.courses ?? []) as ApiCourse[];
  }, [isSearching, listData, searchData]);

  // Convert to display courses
  const allCourses: DisplayCourse[] = useMemo(
    () => rawCourses.map(toDisplayCourse),
    [rawCourses]
  );

  const filtered = useMemo(() => {
    let results = [...allCourses];

    if (selectedCategory !== 'All') {
      results = results.filter((c) => c.category === selectedCategory);
    }

    if (selectedLevel !== 'Any Level') {
      results = results.filter((c) => c.level === selectedLevel);
    }

    if (selectedDuration !== 'Any Duration') {
      results = results.filter((c) => {
        if (selectedDuration === '< 1h') return c.estimatedHours < 1;
        if (selectedDuration === '1-5h')
          return c.estimatedHours >= 1 && c.estimatedHours <= 5;
        if (selectedDuration === '5h+') return c.estimatedHours > 5;
        return true;
      });
    }

    // Sort results
    if (selectedSort === 'popular') {
      results.sort((a, b) => b.lessonCount - a.lessonCount);
    } else if (selectedSort === 'newest') {
      results.reverse();
    } else if (selectedSort === 'rating') {
      results.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    }

    return results;
  }, [allCourses, selectedCategory, selectedLevel, selectedDuration, selectedSort]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const resetPagination = useCallback(() => {
    setVisibleCount(PAGE_SIZE);
  }, []);

  const loadMore = useCallback(() => {
    setVisibleCount((n) => n + PAGE_SIZE);
  }, []);

  return {
    // Search
    searchValue,
    debouncedSearch,
    handleSearchChange,
    // Filters
    selectedCategory,
    setSelectedCategory,
    selectedLevel,
    setSelectedLevel,
    selectedSort,
    setSelectedSort,
    selectedDuration,
    setSelectedDuration,
    // View
    viewMode,
    setViewMode,
    // Data
    fetching,
    error,
    allCourses,
    filtered,
    visible,
    enrolledIds,
    hasMore,
    // Actions
    resetPagination,
    loadMore,
  };
}
