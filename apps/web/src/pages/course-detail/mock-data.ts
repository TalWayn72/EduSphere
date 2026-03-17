/**
 * Mock fallback data shown when GraphQL is unavailable (DEV_MODE / no backend).
 */
import type { CourseDetailData, LessonSummary } from './types';

export const MOCK_LESSONS_FALLBACK: LessonSummary[] = [
  {
    id: 'ad0b6070-9b21-4601-8046-ff4292dc73b1',
    title: 'שיעור 1 — מבוא למשנה',
    type: 'THEMATIC',
    status: 'PUBLISHED',
  },
  {
    id: 'b370a695-7f26-4512-8a3a-4232245bba55',
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
  instructorId: '00000000-0000-0000-0000-000000000001',
  modules: [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      title: 'Module 1: Foundations',
      orderIndex: 0,
      contentItems: [
        {
          id: 'b0000000-0000-0000-0000-000000000001',
          title: 'Introduction Video',
          contentType: 'VIDEO',
          duration: 600,
          orderIndex: 0,
        },
        {
          id: 'b0000000-0000-0000-0000-000000000002',
          title: 'Course Overview',
          contentType: 'PDF',
          duration: null,
          orderIndex: 1,
        },
        {
          id: 'b0000000-0000-0000-0000-000000000003',
          title: 'Foundations Quiz',
          contentType: 'QUIZ',
          duration: null,
          orderIndex: 2,
        },
      ],
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      title: 'Module 2: Core Concepts',
      orderIndex: 1,
      contentItems: [
        {
          id: 'b0000000-0000-0000-0000-000000000004',
          title: 'Deep Dive Video',
          contentType: 'VIDEO',
          duration: 1200,
          orderIndex: 0,
        },
      ],
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      title: 'Module 3: Advanced Topics',
      orderIndex: 2,
      contentItems: [
        {
          id: 'b0000000-0000-0000-0000-000000000005',
          title: 'Advanced Lecture',
          contentType: 'VIDEO',
          duration: 900,
          orderIndex: 0,
        },
      ],
    },
  ],
};
