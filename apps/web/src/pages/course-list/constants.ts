import type { CourseItem } from './types';

export const INSTRUCTOR_ROLES = new Set([
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'INSTRUCTOR',
]);

/** Mock fallback data (shown when GraphQL is unavailable) */
export const MOCK_COURSES_FALLBACK: CourseItem[] = [
  {
    id: 'cc000000-0000-0000-0000-000000000002',
    title: 'Introduction to Talmud Study',
    description:
      'Learn the fundamentals of Talmudic reasoning and argumentation',
    slug: 'intro-talmud',
    thumbnailUrl: '\uD83D\uDCDA',
    instructorId: '00000000-0000-0000-0000-000000000001',
    isPublished: true,
    estimatedHours: 8,
  },
  {
    id: '22222222-2222-2222-2222-222222222221',
    title: 'Advanced Chavruta Techniques',
    description:
      'Master the art of collaborative Talmud learning with AI assistance',
    slug: 'advanced-chavruta',
    thumbnailUrl: '\uD83E\uDD1D',
    instructorId: '00000000-0000-0000-0000-000000000001',
    isPublished: true,
    estimatedHours: 6,
  },
  {
    id: 'ea2e14c1-424e-4bcd-a209-13fb0c7ce84c',
    title: 'Knowledge Graph Navigation',
    description:
      'Explore interconnected concepts in Jewish texts using graph-based learning',
    slug: 'knowledge-graph',
    thumbnailUrl: '\uD83D\uDD78\uFE0F',
    instructorId: '00000000-0000-0000-0000-000000000001',
    isPublished: true,
    estimatedHours: 4,
  },
  {
    id: '72d6a4b2-3728-4ce0-b748-f03e90e39d19',
    title: 'Jewish Philosophy: Rambam & Ramban',
    description:
      'A comparative study of Maimonides and Nachmanides on faith and reason',
    slug: 'jewish-philosophy',
    thumbnailUrl: '\uD83D\uDD2D',
    instructorId: '00000000-0000-0000-0000-000000000001',
    isPublished: true,
    estimatedHours: 10,
  },
];
