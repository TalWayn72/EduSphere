import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LayoutGrid, List } from 'lucide-react';
import { CourseCard, type CourseCardProps } from '@/components/CourseCard';
import {
  COURSES_DISCOVERY_QUERY,
  SEARCH_COURSES_DISCOVERY_QUERY,
} from '@/lib/graphql/courses-discovery.queries';
import { MY_ENROLLMENTS_QUERY } from '@/lib/graphql/content.queries';

// ── Types ─────────────────────────────────────────────────────────────────────

type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';

/** Shape returned by the courses query */
interface ApiCourse {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  estimatedHours?: number | null;
  isPublished: boolean;
  instructorId: string;
  slug: string;
  createdAt: string;
}

/** Internal representation used for filtering / sorting */
type DisplayCourse = Omit<CourseCardProps, 'onClick'> & { level: CourseLevel };

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_FILTERS = [
  'All',
  'Programming',
  'Design',
  'Business',
  'Science',
  'Languages',
  'Arts',
];

const LEVEL_FILTERS = ['Any Level', 'Beginner', 'Intermediate', 'Advanced'];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]['value'];

const DURATION_FILTERS = ['Any Duration', '< 1h', '1-5h', '5h+'];

const PAGE_SIZE = 12;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map an API course to a display course for CourseCard rendering. */
function toDisplayCourse(course: ApiCourse): DisplayCourse {
  // Derive level heuristic from estimatedHours (no level field in SDL)
  let level: CourseLevel = 'Beginner';
  if ((course.estimatedHours ?? 0) > 10) level = 'Advanced';
  else if ((course.estimatedHours ?? 0) > 4) level = 'Intermediate';

  return {
    id: course.id,
    title: course.title,
    instructor: `Instructor ${course.instructorId.slice(0, 6)}`,
    category: 'General',
    lessonCount: 0,
    estimatedHours: course.estimatedHours ?? 0,
    enrolled: false,
    mastery: 'none',
    featured: false,
    level,
  };
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden animate-pulse"
      aria-hidden="true"
      data-testid="skeleton-card"
    >
      <div className="aspect-video bg-muted" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-3 w-1/3 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-8 w-full rounded bg-muted mt-1" />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div
      className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center"
      data-testid="courses-empty-state"
    >
      <div className="rounded-full bg-muted p-6">
        <svg
          className="h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">
          No courses found
        </p>
        {query && (
          <p className="text-sm text-muted-foreground mt-1">
            No results for &ldquo;{query}&rdquo;. Try a different search term or
            remove filters.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner() {
  return (
    <div
      className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center"
      data-testid="courses-error-banner"
      role="alert"
    >
      <p className="text-lg font-semibold text-destructive">
        Unable to load courses. Please try again.
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CoursesDiscoveryPage() {
  const navigate = useNavigate();

  // Mounted guard — urql iron rule: pause until mounted
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
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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
      // Newest = reverse insertion order (higher id index = newer)
      results.reverse();
    } else if (selectedSort === 'rating') {
      results.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    }

    return results;
  }, [allCourses, selectedCategory, selectedLevel, selectedDuration, selectedSort]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Discover Courses
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore {fetching ? '…' : `${allCourses.length}`} courses across all subjects
          </p>
        </div>

        {/* Search + View toggle */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
              />
            </svg>
            <Input
              className="pl-9"
              placeholder="Search courses, instructors..."
              value={searchValue}
              onChange={handleSearchChange}
              data-testid="course-search-input"
              aria-label="Search courses"
            />
          </div>

          <div
            className="flex items-center rounded-lg border border-border overflow-hidden"
            data-testid="view-toggle"
            role="group"
            aria-label="View mode"
          >
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="rounded-none h-9 w-9"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="rounded-none h-9 w-9"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div
          className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide"
          data-testid="filter-bar"
          aria-label="Course filters"
        >
          {/* Category pills */}
          <div className="flex gap-1.5 shrink-0">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
                }`}
                aria-pressed={selectedCategory === cat}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="w-px bg-border shrink-0 mx-1" aria-hidden="true" />

          {/* Level pills */}
          <div
            role="group"
            aria-label="Filter by level"
            className="flex gap-1.5 shrink-0"
            data-testid="level-filter-group"
          >
            {LEVEL_FILTERS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedLevel === lvl
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-background text-muted-foreground border-border hover:border-accent hover:text-accent-foreground'
                }`}
                aria-pressed={selectedLevel === lvl}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="w-px bg-border shrink-0 mx-1" aria-hidden="true" />

          {/* Duration pills */}
          <div className="flex gap-1.5 shrink-0">
            {DURATION_FILTERS.map((dur) => (
              <button
                key={dur}
                onClick={() => {
                  setSelectedDuration(dur);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedDuration === dur
                    ? 'bg-secondary text-secondary-foreground border-secondary'
                    : 'bg-background text-muted-foreground border-border hover:border-secondary hover:text-secondary-foreground'
                }`}
                aria-pressed={selectedDuration === dur}
              >
                {dur}
              </button>
            ))}
          </div>

          <div className="w-px bg-border shrink-0 mx-1" aria-hidden="true" />

          {/* Sort select */}
          <div className="flex items-center gap-1.5 shrink-0">
            <label
              htmlFor="sort-select"
              className="text-xs text-muted-foreground whitespace-nowrap"
            >
              Sort by
            </label>
            <Select
              value={selectedSort}
              onValueChange={(v) => setSelectedSort(v as SortOption)}
            >
              <SelectTrigger
                id="sort-select"
                className="h-7 text-xs min-w-[130px]"
                aria-label="Sort courses"
                data-testid="sort-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results summary */}
        <p className="text-sm text-muted-foreground mb-4">
          {fetching
            ? 'Loading courses…'
            : filtered.length === 0 && !error
              ? 'No courses match your filters'
              : `Showing ${Math.min(visibleCount, filtered.length)} of ${filtered.length} course${filtered.length !== 1 ? 's' : ''}`}
        </p>

        {/* Courses grid / list */}
        <div
          className={
            fetching
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
              : viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'flex flex-col gap-4'
          }
          data-testid="courses-grid"
          data-view={viewMode}
          aria-label="Course listing"
        >
          {fetching
            ? Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
            : error
              ? [<ErrorBanner key="error" />]
              : visible.length === 0
                ? [
                    <EmptyState
                      key="empty"
                      query={debouncedSearch}
                    />,
                  ]
                : visible.map((course) => (
                    <CourseCard
                      key={course.id}
                      {...course}
                      enrolled={enrolledIds.has(course.id)}
                      onClick={() => {
                        navigate(`/courses/${course.id}`);
                      }}
                    />
                  ))}
        </div>

        {/* Load more */}
        {!fetching && !error && hasMore && (
          <div className="flex justify-center mt-10">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              data-testid="load-more-button"
            >
              Load More ({filtered.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

// XP/enrollment display — wired from real data above
