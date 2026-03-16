/**
 * Mock fallback data shown when GraphQL is unavailable (DEV_MODE / no backend).
 */
import type { CourseDetailData, LessonSummary } from './types';

export const MOCK_LESSONS_FALLBACK: LessonSummary[] = [
  {
    id: 'lesson-demo-1',
    title: 'שיעור 1 — מבוא למשנה',
    type: 'THEMATIC',
    status: 'PUBLISHED',
  },
  {
    id: 'lesson-demo-2',
    title: 'שיעור 2 — מבנה הגמרא',
    type: 'SEQUENTIAL',
    status: 'READY',
  },
];

export const MOCK_COURSE_FALLBACK: CourseDetailData = {
  id: 'cc000000-0000-0000-0000-000000000002',
  title: 'Introduction to Talmud Study',
  description:
    'Learn the fundamentals of Talmudic reasoning and argumentation using AI-powered tools.',
  thumbnailUrl: '📚',
  estimatedHours: 8,
  isPublished: true,
  instructorId: 'instructor-demo',
  modules: [
    {
      id: 'mod-demo-1',
      title: 'Module 1: Foundations',
      orderIndex: 0,
      contentItems: [
        {
          id: 'content-1',
          title: 'Introduction Video',
          contentType: 'VIDEO',
          duration: 600,
          orderIndex: 0,
        },
        {
          id: 'content-2',
          title: 'Course Overview',
          contentType: 'PDF',
          duration: null,
          orderIndex: 1,
        },
        {
          id: 'content-3',
          title: 'Foundations Quiz',
          contentType: 'QUIZ',
          duration: null,
          orderIndex: 2,
        },
      ],
    },
    {
      id: 'mod-demo-2',
      title: 'Module 2: Core Concepts',
      orderIndex: 1,
      contentItems: [
        {
          id: 'content-4',
          title: 'Deep Dive Video',
          contentType: 'VIDEO',
          duration: 1200,
          orderIndex: 0,
        },
      ],
    },
    {
      id: 'mod-demo-3',
      title: 'Module 3: Advanced Topics',
      orderIndex: 2,
      contentItems: [
        {
          id: 'content-5',
          title: 'Advanced Lecture',
          contentType: 'VIDEO',
          duration: 900,
          orderIndex: 0,
        },
      ],
    },
  ],
};
