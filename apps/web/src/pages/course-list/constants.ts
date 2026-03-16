import type { CourseItem } from './types';

export const INSTRUCTOR_ROLES = new Set([
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'INSTRUCTOR',
]);

/** Mock fallback data (shown when GraphQL is unavailable) */
export const MOCK_COURSES_FALLBACK: CourseItem[] = [
  {
    id: 'mock-course-1',
    title: 'Introduction to Talmud Study',
    description:
      'Learn the fundamentals of Talmudic reasoning and argumentation',
    slug: 'intro-talmud',
    thumbnailUrl: '\uD83D\uDCDA',
    instructorId: 'instructor-demo',
    isPublished: true,
    estimatedHours: 8,
  },
  {
    id: 'mock-course-2',
    title: 'Advanced Chavruta Techniques',
    description:
      'Master the art of collaborative Talmud learning with AI assistance',
    slug: 'advanced-chavruta',
    thumbnailUrl: '\uD83E\uDD1D',
    instructorId: 'instructor-demo',
    isPublished: true,
    estimatedHours: 6,
  },
  {
    id: 'mock-course-3',
    title: 'Knowledge Graph Navigation',
    description:
      'Explore interconnected concepts in Jewish texts using graph-based learning',
    slug: 'knowledge-graph',
    thumbnailUrl: '\uD83D\uDD78\uFE0F',
    instructorId: 'instructor-demo',
    isPublished: true,
    estimatedHours: 4,
  },
  {
    id: 'mock-course-4',
    title: 'Jewish Philosophy: Rambam & Ramban',
    description:
      'A comparative study of Maimonides and Nachmanides on faith and reason',
    slug: 'jewish-philosophy',
    thumbnailUrl: '\uD83D\uDD2D',
    instructorId: 'instructor-demo',
    isPublished: true,
    estimatedHours: 10,
  },
];
