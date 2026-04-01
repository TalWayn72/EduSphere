import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { CourseCard } from '@/components/CourseCard';
import { PageShell } from '@/components/PageShell';

import { useCoursesDiscovery } from './useCoursesDiscovery';
import { DiscoveryFilters } from './DiscoveryFilters';
import { SkeletonCard } from './SkeletonCard';
import { EmptyState } from './EmptyState';
import { ErrorBanner } from './ErrorBanner';

export function CoursesDiscoveryPage() {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();
  const {
    searchValue,
    debouncedSearch,
    handleSearchChange,
    selectedCategory,
    setSelectedCategory,
    selectedLevel,
    setSelectedLevel,
    selectedSort,
    setSelectedSort,
    selectedDuration,
    setSelectedDuration,
    viewMode,
    setViewMode,
    fetching,
    error,
    allCourses,
    filtered,
    visible,
    enrolledIds,
    hasMore,
    resetPagination,
    loadMore,
  } = useCoursesDiscovery();

  return (
    <Layout>
      <PageShell size="2xl" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {t('discoverCourses')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {fetching
              ? t('exploreCoursesCounting')
              : t('exploreCoursesCount', { count: allCourses.length })}
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
              placeholder={t('searchCoursesInstructors')}
              value={searchValue}
              onChange={handleSearchChange}
              data-testid="course-search-input"
              aria-label={t('searchCoursesLabel')}
            />
          </div>

          <div
            className="flex items-center rounded-lg border border-border overflow-hidden"
            data-testid="view-toggle"
            role="group"
            aria-label={t('viewMode')}
          >
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="rounded-none h-9 w-9"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label={t('gridView')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="rounded-none h-9 w-9"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label={t('listView')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <DiscoveryFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedLevel={selectedLevel}
          onLevelChange={setSelectedLevel}
          selectedDuration={selectedDuration}
          onDurationChange={setSelectedDuration}
          selectedSort={selectedSort}
          onSortChange={setSelectedSort}
          onResetPagination={resetPagination}
        />

        {/* Results summary */}
        <p className="text-sm text-muted-foreground mb-4">
          {fetching
            ? t('loadingCourses')
            : filtered.length === 0 && !error
              ? t('noCoursesMatchFilters')
              : t('showingOfCount', {
                  showing: Math.min(visible.length, filtered.length),
                  total: filtered.length,
                  plural: filtered.length !== 1 ? 's' : '',
                })}
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
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : error
              ? [<ErrorBanner key="error" />]
              : visible.length === 0
                ? [<EmptyState key="empty" query={debouncedSearch} />]
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
              onClick={loadMore}
              data-testid="load-more-button"
            >
              {t('loadMore', { remaining: filtered.length - visible.length })}
            </Button>
          </div>
        )}
      </PageShell>
    </Layout>
  );
}
