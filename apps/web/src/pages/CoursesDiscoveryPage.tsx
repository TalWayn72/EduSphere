import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { CourseCard, type CourseCardProps } from '@/components/CourseCard';
// TODO: replace with real query — import { useQuery } from 'urql';
// TODO: import { COURSES_QUERY } from '@/lib/queries';

// ── DEV_MODE mock data ────────────────────────────────────────────────────────

const MOCK_COURSES: Omit<CourseCardProps, 'onClick'>[] = [
  {
    id: 'c-1',
    title: 'Complete TypeScript Bootcamp: From Zero to Advanced',
    instructor: 'Sarah Chen',
    category: 'Programming',
    lessonCount: 48,
    estimatedHours: 12,
    enrolled: true,
    progress: 65,
    mastery: 'proficient',
    featured: true,
  },
  {
    id: 'c-2',
    title: 'UI/UX Design Fundamentals with Figma',
    instructor: 'Marcus Webb',
    category: 'Design',
    lessonCount: 32,
    estimatedHours: 8,
    enrolled: true,
    progress: 30,
    mastery: 'familiar',
    featured: false,
  },
  {
    id: 'c-3',
    title: 'Business Strategy in the Age of AI',
    instructor: 'Dr. Priya Sharma',
    category: 'Business',
    lessonCount: 20,
    estimatedHours: 5,
    enrolled: false,
    mastery: 'none',
    featured: true,
  },
  {
    id: 'c-4',
    title: 'Quantum Computing: Foundations and Applications',
    instructor: 'Prof. Lior Ben-David',
    category: 'Science',
    lessonCount: 36,
    estimatedHours: 10,
    enrolled: false,
    mastery: 'none',
    featured: false,
  },
  {
    id: 'c-5',
    title: 'Modern Spanish: Conversational Fluency in 90 Days',
    instructor: 'Isabella Torres',
    category: 'Languages',
    lessonCount: 60,
    estimatedHours: 15,
    enrolled: true,
    progress: 10,
    mastery: 'attempted',
    featured: false,
  },
  {
    id: 'c-6',
    title: 'Digital Photography and Lightroom Editing',
    instructor: 'Kenji Nakamura',
    category: 'Arts',
    lessonCount: 24,
    estimatedHours: 6,
    enrolled: false,
    mastery: 'none',
    featured: false,
  },
  {
    id: 'c-7',
    title: 'React 19 and Next.js 15: Full-Stack Development',
    instructor: 'Amara Osei',
    category: 'Programming',
    lessonCount: 56,
    estimatedHours: 14,
    enrolled: true,
    progress: 100,
    mastery: 'mastered',
    featured: false,
  },
  {
    id: 'c-8',
    title: 'Linear Algebra for Machine Learning',
    instructor: 'Prof. Yuki Tanaka',
    category: 'Mathematics',
    lessonCount: 28,
    estimatedHours: 7,
    enrolled: false,
    mastery: 'none',
    featured: false,
  },
  {
    id: 'c-9',
    title: 'Brand Identity Design: From Concept to Launch',
    instructor: 'Fatima Al-Hassan',
    category: 'Design',
    lessonCount: 18,
    estimatedHours: 4,
    enrolled: false,
    mastery: 'none',
    featured: true,
  },
  {
    id: 'c-10',
    title: 'Entrepreneurship and Startup Finance',
    instructor: 'James Okafor',
    category: 'Business',
    lessonCount: 22,
    estimatedHours: 6,
    enrolled: false,
    mastery: 'none',
    featured: false,
  },
  {
    id: 'c-11',
    title: 'Ancient Civilizations: Greece, Rome and Beyond',
    instructor: 'Dr. Elena Vasquez',
    category: 'History',
    lessonCount: 30,
    estimatedHours: 8,
    enrolled: false,
    mastery: 'none',
    featured: false,
  },
  {
    id: 'c-12',
    title: 'Data Structures and Algorithms in Python',
    instructor: 'Raj Patel',
    category: 'Programming',
    lessonCount: 42,
    estimatedHours: 11,
    enrolled: true,
    progress: 45,
    mastery: 'familiar',
    featured: false,
  },
];

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

const DURATION_FILTERS = ['Any Duration', '< 1h', '1-5h', '5h+'];

const PAGE_SIZE = 12;

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden animate-pulse"
      aria-hidden="true"
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

// ── Page ──────────────────────────────────────────────────────────────────────

export function CoursesDiscoveryPage() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('Any Level');
  const [selectedDuration, setSelectedDuration] = useState('Any Duration');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading] = useState(false);

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

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    let results = MOCK_COURSES;

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      results = results.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.instructor.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'All') {
      results = results.filter((c) => c.category === selectedCategory);
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

    return results;
  }, [debouncedSearch, selectedCategory, selectedDuration]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Discover Courses
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore {MOCK_COURSES.length} courses across all subjects
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
          <div className="flex gap-1.5 shrink-0">
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
        </div>

        {/* Results summary */}
        <p className="text-sm text-muted-foreground mb-4">
          {filtered.length === 0
            ? 'No courses match your filters'
            : `Showing ${Math.min(visibleCount, filtered.length)} of ${filtered.length} course${filtered.length !== 1 ? 's' : ''}`}
        </p>

        {/* Courses grid / list */}
        <div
          className={
            isLoading
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
              : viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'flex flex-col gap-4'
          }
          data-testid="courses-grid"
          data-view={viewMode}
          aria-label="Course listing"
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
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
                    onClick={() => {
                      navigate(`/courses/${course.id}`);
                    }}
                  />
                ))}
        </div>

        {/* Load more */}
        {!isLoading && hasMore && (
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
    </div>
  );
}
