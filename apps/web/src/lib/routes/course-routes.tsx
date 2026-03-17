import React, { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { guarded } from './helpers';

// ── Lazy loaded course pages ─────────────────────────────────────────────────
const CourseList = lazy(() =>
  import('@/pages/CourseList').then((m) => ({ default: m.CourseList }))
);
const CourseCreatePage = lazy(() =>
  import('@/pages/CourseCreatePage').then((m) => ({
    default: m.CourseCreatePage,
  }))
);
const CourseDetailPage = lazy(() =>
  import('@/pages/CourseDetailPage').then((m) => ({
    default: m.CourseDetailPage,
  }))
);
const CourseEditPage = lazy(() =>
  import('@/pages/CourseEditPage').then((m) => ({
    default: m.CourseEditPage,
  }))
);
const CourseAnalyticsPage = lazy(() =>
  import('@/pages/CourseAnalyticsPage').then((m) => ({
    default: m.CourseAnalyticsPage,
  }))
);
const CoursesDiscoveryPage = lazy(() =>
  import('@/pages/CoursesDiscoveryPage').then((m) => ({
    default: m.CoursesDiscoveryPage,
  }))
);
const CourseLibraryPage = lazy(() =>
  import('@/pages/CourseLibraryPage').then((m) => ({
    default: m.CourseLibraryPage,
  }))
);
const CreateLessonPage = lazy(() =>
  import('@/pages/CreateLessonPage').then((m) => ({
    default: m.CreateLessonPage,
  }))
);
const LessonDetailPage = lazy(() =>
  import('@/pages/LessonDetailPage').then((m) => ({
    default: m.LessonDetailPage,
  }))
);
const LessonPipelinePage = lazy(() =>
  import('@/pages/LessonPipelinePage').then((m) => ({
    default: m.LessonPipelinePage,
  }))
);
const LessonResultsPage = lazy(() =>
  import('@/pages/LessonResultsPage').then((m) => ({
    default: m.LessonResultsPage,
  }))
);
const LessonPipelineBuilderPage = lazy(() =>
  import('@/pages/LessonPipelineBuilderPage').then((m) => ({
    default: m.LessonPipelineBuilderPage,
  }))
);
const QuizBuilderPage = lazy(() =>
  import('@/pages/QuizBuilderPage').then((m) => ({
    default: m.QuizBuilderPage,
  }))
);
const ContentImportPage = lazy(() =>
  import('@/pages/ContentImportPage').then((m) => ({
    default: m.ContentImportPage,
  }))
);
const ComplianceLibraryPage = lazy(() =>
  import('@/pages/ComplianceLibraryPage').then((m) => ({
    default: m.ComplianceLibraryPage,
  }))
);

/**
 * Course & lesson routes — discovery, CRUD, analytics, lessons, quizzes.
 */
export const courseRoutes: RouteObject[] = [
  // Discovery routes
  { path: '/explore', element: guarded(<CoursesDiscoveryPage />) },
  { path: '/discover', element: guarded(<CoursesDiscoveryPage />) },
  { path: '/courses/discover', element: guarded(<CoursesDiscoveryPage />) },
  // Course list & CRUD
  { path: '/courses', element: guarded(<CourseList />) },
  { path: '/courses/new', element: guarded(<CourseCreatePage />) },
  { path: '/courses/:courseId/analytics', element: guarded(<CourseAnalyticsPage />) },
  { path: '/courses/:courseId/edit', element: guarded(<CourseEditPage />) },
  // Lesson Pipeline Builder — WYSIWYG authoring
  { path: '/courses/:courseId/pipeline/builder', element: guarded(<LessonPipelineBuilderPage />) },
  // Quiz Builder — instructor creates a quiz for a module
  { path: '/courses/:courseId/modules/:moduleId/quiz/new', element: guarded(<QuizBuilderPage />) },
  // Create lesson — must come before :courseId to avoid route shadowing
  { path: '/courses/:courseId/lessons/new', element: guarded(<CreateLessonPage />) },
  { path: '/courses/:courseId/lessons/:lessonId/pipeline', element: guarded(<LessonPipelinePage />) },
  { path: '/courses/:courseId/lessons/:lessonId/results', element: guarded(<LessonResultsPage />) },
  { path: '/courses/:courseId/lessons/:lessonId', element: guarded(<LessonDetailPage />) },
  { path: '/courses/:courseId', element: guarded(<CourseDetailPage />) },
  // Content import — bulk import lessons
  { path: '/courses/:courseId/import', element: guarded(<ContentImportPage />) },
  // Library
  { path: '/library', element: guarded(<CourseLibraryPage />) },
  // Phase 64 — pre-built compliance course library
  { path: '/library/compliance', element: guarded(<ComplianceLibraryPage />) },
  // Quiz Builder — top-level entry point for instructors
  { path: '/quiz-builder', element: guarded(<QuizBuilderPage />) },
];
