import type { CourseCardProps } from '@/components/CourseCard';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';

/** Shape returned by the courses query */
export interface ApiCourse {
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
export type DisplayCourse = Omit<CourseCardProps, 'onClick'> & {
  level: CourseLevel;
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const CATEGORY_FILTERS = [
  'All',
  'Programming',
  'Design',
  'Business',
  'Science',
  'Languages',
  'Arts',
];

export const LEVEL_FILTERS = [
  'Any Level',
  'Beginner',
  'Intermediate',
  'Advanced',
];

export const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

export const DURATION_FILTERS = ['Any Duration', '< 1h', '1-5h', '5h+'];

export const PAGE_SIZE = 12;
