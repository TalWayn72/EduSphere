import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CATEGORY_FILTERS,
  LEVEL_FILTERS,
  DURATION_FILTERS,
  SORT_OPTIONS,
  type SortOption,
} from './types';

interface DiscoveryFiltersProps {
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedLevel: string;
  onLevelChange: (lvl: string) => void;
  selectedDuration: string;
  onDurationChange: (dur: string) => void;
  selectedSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  onResetPagination: () => void;
}

export function DiscoveryFilters({
  selectedCategory,
  onCategoryChange,
  selectedLevel,
  onLevelChange,
  selectedDuration,
  onDurationChange,
  selectedSort,
  onSortChange,
  onResetPagination,
}: DiscoveryFiltersProps) {
  const { t } = useTranslation('courses');
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide"
      data-testid="filter-bar"
      aria-label={t('courseFilter')}
    >
      {/* Category pills */}
      <div className="flex gap-1.5 shrink-0">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              onCategoryChange(cat);
              onResetPagination();
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
            onClick={() => onLevelChange(lvl)}
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
              onDurationChange(dur);
              onResetPagination();
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
          {t('sortBy')}
        </label>
        <Select
          value={selectedSort}
          onValueChange={(v) => onSortChange(v as SortOption)}
        >
          <SelectTrigger
            id="sort-select"
            className="h-7 text-xs min-w-[130px]"
            aria-label={t('sortBy')}
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
  );
}
