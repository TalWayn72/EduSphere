import React from 'react';
import { Search } from 'lucide-react';
import type { SortOption, TabOption } from './types';

interface CourseFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  activeTab: TabOption;
  onTabChange: (value: TabOption) => void;
  isInstructor: boolean;
}

export const CourseFilters = React.memo(function CourseFilters({
  search,
  onSearchChange,
  sort,
  onSortChange,
  activeTab,
  onTabChange,
  isInstructor,
}: CourseFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search courses..."
          aria-label="Search courses"
          className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {!isInstructor && (
        <div
          className="flex rounded-md border overflow-hidden shrink-0"
          role="tablist"
          aria-label="Course filter"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => onTabChange('all')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            All
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'enrolled'}
            onClick={() => onTabChange('enrolled')}
            className={`px-3 py-2 text-sm font-medium border-l transition-colors ${
              activeTab === 'enrolled'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            My Courses
          </button>
        </div>
      )}
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        aria-label="Sort courses"
        className="px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring shrink-0"
      >
        <option value="newest">Newest</option>
        <option value="title">{`A \u2192 Z`}</option>
        <option value="duration">Duration</option>
      </select>
    </div>
  );
});
